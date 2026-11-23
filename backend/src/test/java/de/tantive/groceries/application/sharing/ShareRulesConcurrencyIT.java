package de.tantive.groceries.application.sharing;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.MemberLimitReachedException;
import de.tantive.groceries.domain.ShareLinkInvalidException;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.in.GetShareLinkQuery;
import de.tantive.groceries.ports.in.GetShareLinkUseCase;
import de.tantive.groceries.ports.in.JoinListCommand;
import de.tantive.groceries.ports.in.JoinListUseCase;
import de.tantive.groceries.ports.in.RenewShareLinkCommand;
import de.tantive.groceries.ports.in.RenewShareLinkUseCase;
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

/** Rules over other rows hold under concurrency, enforced in PostgreSQL (ARCH-UC-16, SPRING-DB-16/22, BR-06, BR-12). */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test",
            "app.idp-admin.client-secret=test",
            "app.sharing.public-base-url=http://localhost:8080"
        })
@Import(TestcontainersConfiguration.class)
class ShareRulesConcurrencyIT {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    @Autowired
    GetShareLinkUseCase getShareLink;

    @Autowired
    RenewShareLinkUseCase renewShareLink;

    @Autowired
    JoinListUseCase joinList;

    @Autowired
    JdbcClient jdbc;

    @Test
    void twoPeopleJoiningTheFiftiethPlaceAtOnceLetExactlyOneIn() throws Exception {
        for (int round = 0; round < 3; round++) {
            UUID owner = Arrange.user(jdbc);
            UUID list = Arrange.list(jdbc, owner, "Voll", NOW);
            for (int i = 0; i < 48; i++) {
                Arrange.join(jdbc, Arrange.user(jdbc), list, NOW);
            }
            ShareToken token = getShareLink.getShareLink(new GetShareLinkQuery(caller(owner), list));
            Caller first = caller(Arrange.user(jdbc));
            Caller second = caller(Arrange.user(jdbc));

            List<Object> outcomes = runTogether(
                    () -> joinList.joinList(new JoinListCommand(first, token)),
                    () -> joinList.joinList(new JoinListCommand(second, token)));

            assertThat(outcomes)
                    .filteredOn(o -> o instanceof MemberLimitReachedException)
                    .hasSize(1);
            assertThat(count("select count(*) from memberships where list_id = ?", list))
                    .isEqualTo(50);
        }
    }

    @Test
    void twoFirstRequestsForTheLinkEndWithTheSameToken() throws Exception {
        for (int round = 0; round < 5; round++) {
            UUID alice = Arrange.user(jdbc);
            UUID bob = Arrange.user(jdbc);
            UUID list = Arrange.list(jdbc, alice, "WG", NOW);
            Arrange.join(jdbc, bob, list, NOW);

            List<Object> outcomes = runTogether(
                    () -> getShareLink.getShareLink(new GetShareLinkQuery(caller(alice), list)),
                    () -> getShareLink.getShareLink(new GetShareLinkQuery(caller(bob), list)));

            assertThat(outcomes.get(0)).isInstanceOf(ShareToken.class).isEqualTo(outcomes.get(1));
            assertThat(count("select count(*) from lists where id = ? and share_token is not null", list))
                    .isEqualTo(1);
        }
    }

    @Test
    void aRenewalAndAJoinAtOnceNeverLeaveTheOldTokenWorkingAfterTheRenewal() throws Exception {
        for (int round = 0; round < 5; round++) {
            UUID alice = Arrange.user(jdbc);
            UUID list = Arrange.list(jdbc, alice, "WG", NOW);
            ShareToken old = getShareLink.getShareLink(new GetShareLinkQuery(caller(alice), list));
            Caller bob = caller(Arrange.user(jdbc));

            List<Object> outcomes = runTogether(
                    () -> renewShareLink.renewShareLink(new RenewShareLinkCommand(caller(alice), list)),
                    () -> joinList.joinList(new JoinListCommand(bob, old)));

            // either the join came first (and Bob is a member) or the renewal did (and the old link is dead)
            boolean joined = count("select count(*) from memberships where list_id = ?", list) == 2;
            assertThat(outcomes.get(1) instanceof ShareLinkInvalidException).isEqualTo(!joined);
            Caller late = caller(Arrange.user(jdbc));
            assertThat(runTogether(() -> joinList.joinList(new JoinListCommand(late, old))))
                    .singleElement()
                    .isInstanceOf(ShareLinkInvalidException.class);
        }
    }

    private static Caller caller(UUID id) {
        return new Caller(id, "sub-" + id, id + "@example.test", "Test");
    }

    private long count(String sql, Object param) {
        return jdbc.sql(sql).param(param).query(Long.class).single();
    }

    @SafeVarargs
    private static List<Object> runTogether(Callable<?>... calls) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(calls.length);
        try {
            CountDownLatch go = new CountDownLatch(1);
            List<Future<Object>> futures = new ArrayList<>();
            for (Callable<?> call : calls) {
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
