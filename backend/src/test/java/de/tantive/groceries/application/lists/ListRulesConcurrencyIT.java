package de.tantive.groceries.application.lists;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.ListLimitReachedException;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.ports.in.CreateListCommand;
import de.tantive.groceries.ports.in.CreateListUseCase;
import de.tantive.groceries.ports.in.LeaveListCommand;
import de.tantive.groceries.ports.in.LeaveListUseCase;
import de.tantive.groceries.support.Arrange;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Rules over other rows hold under concurrency, enforced in PostgreSQL (ARCH-UC-16, SPRING-DB-16/22). */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test",
            "app.idp-admin.client-secret=test",
            "app.sharing.public-base-url=http://localhost:8080"
        })
@Import(TestcontainersConfiguration.class)
class ListRulesConcurrencyIT {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    @Autowired
    CreateListUseCase createList;

    @Autowired
    LeaveListUseCase leaveList;

    @Autowired
    JdbcClient jdbc;

    @Test
    void twoParallelCreationsAtNinetyNineListsLetExactlyOneThrough() throws Exception {
        UUID alice = Arrange.user(jdbc);
        jdbc.sql("""
                        insert into lists (id, name, created_by, created_at, updated_at)
                        select gen_random_uuid(), 'L' || g, ?, now(), now() from generate_series(1, 99) g
                        """).param(alice).update();
        jdbc.sql(
                        "insert into memberships (user_id, list_id, joined_at) select ?, id, now() from lists where created_by = ?")
                .params(alice, alice)
                .update();
        Caller caller = new Caller(alice, "sub-" + alice, alice + "@example.test", "Test");

        List<Object> outcomes = runTogether(
                () -> createList.createList(new CreateListCommand(caller, ListName.of("Hundertste"))),
                () -> createList.createList(new CreateListCommand(caller, ListName.of("Hundertundeins"))));

        assertThat(outcomes)
                .filteredOn(o -> o instanceof ListLimitReachedException)
                .hasSize(1);
        assertThat(count("select count(*) from memberships where user_id = ?", alice))
                .isEqualTo(100);
    }

    @Test
    void theLastTwoMembersLeavingAtOnceDeleteTheListExactlyOnceWithoutAnError() throws Exception {
        for (int round = 0; round < 5; round++) {
            UUID alice = Arrange.user(jdbc);
            UUID bob = Arrange.user(jdbc);
            UUID list = Arrange.list(jdbc, alice, "WG", NOW);
            Arrange.join(jdbc, bob, list, NOW);
            Caller callerA = new Caller(alice, "sub-" + alice, alice + "@example.test", "A");
            Caller callerB = new Caller(bob, "sub-" + bob, bob + "@example.test", "B");

            List<Object> outcomes = runTogether(
                    () -> {
                        leaveList.leaveList(new LeaveListCommand(callerA, list));
                        return "left";
                    },
                    () -> {
                        leaveList.leaveList(new LeaveListCommand(callerB, list));
                        return "left";
                    });

            assertThat(outcomes).containsExactly("left", "left");
            assertThat(count("select count(*) from lists where id = ?", list)).isZero();
            assertThat(count("select count(*) from memberships where list_id = ?", list))
                    .isZero();
        }
    }

    private long count(String sql, Object param) {
        return jdbc.sql(sql).param(param).query(Long.class).single();
    }

    /** Starts both calls at the same moment; returns the results, or the exception a call threw. */
    private static List<Object> runTogether(Callable<?> first, Callable<?> second) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            CountDownLatch go = new CountDownLatch(1);
            List<Future<Object>> futures = new ArrayList<>();
            for (Callable<?> call : List.of(first, second)) {
                futures.add(pool.submit(() -> {
                    go.await();
                    return call.call();
                }));
            }
            go.countDown();
            List<Object> outcomes = new ArrayList<>();
            for (Future<Object> future : futures) {
                try {
                    outcomes.add(future.get());
                } catch (ExecutionException e) {
                    outcomes.add(e.getCause());
                }
            }
            return outcomes;
        } finally {
            pool.shutdownNow();
        }
    }
}
