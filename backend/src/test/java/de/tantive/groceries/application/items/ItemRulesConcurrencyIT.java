package de.tantive.groceries.application.items;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.ItemLimitReachedException;
import de.tantive.groceries.domain.ItemText;
import de.tantive.groceries.ports.in.AddItemCommand;
import de.tantive.groceries.ports.in.AddItemUseCase;
import de.tantive.groceries.support.Arrange;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
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

/** The item limit holds under concurrency, enforced by the lock on the list row (ARCH-UC-16, SPRING-DB-22). */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test",
            "app.sharing.public-base-url=http://localhost:8080"
        })
@Import(TestcontainersConfiguration.class)
class ItemRulesConcurrencyIT {

    @Autowired
    AddItemUseCase addItem;

    @Autowired
    JdbcClient jdbc;

    @Test
    void twoParallelAdditionsAtFourHundredNinetyNineItemsLetExactlyOneThrough() throws Exception {
        UUID alice = Arrange.user(jdbc);
        UUID list = Arrange.list(jdbc, alice, "Voll", Instant.now());
        jdbc.sql("""
                        insert into items (id, list_id, text, done, created_at)
                        select gen_random_uuid(), ?, 'I' || g, false, now() from generate_series(1, 499) g
                        """).param(list).update();
        Caller caller = new Caller(alice, "sub-" + alice, alice + "@example.test", "Test");

        List<Object> outcomes = runTogether(caller, list);

        assertThat(outcomes)
                .filteredOn(o -> o instanceof ItemLimitReachedException)
                .hasSize(1);
        assertThat(jdbc.sql("select count(*) from items where list_id = ?")
                        .param(list)
                        .query(Long.class)
                        .single())
                .isEqualTo(500);
    }

    private List<Object> runTogether(Caller caller, UUID list) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            CountDownLatch go = new CountDownLatch(1);
            List<Future<Object>> futures = new ArrayList<>();
            for (String text : List.of("Fünfhundertster", "Fünfhunderterster")) {
                futures.add(pool.submit(() -> {
                    go.await();
                    return addItem.addItem(new AddItemCommand(caller, list, ItemText.of(text)));
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
