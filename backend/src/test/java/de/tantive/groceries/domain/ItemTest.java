package de.tantive.groceries.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ItemTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    @Test
    void aNewItemIsOpenAndStartsAtVersionZero() {
        Item item = Item.create(UUID.randomUUID(), ItemText.of("Milch"), NOW);

        assertThat(item.done()).isFalse();
        assertThat(item.version()).isZero();
        assertThat(item.createdAt()).isEqualTo(NOW);
    }

    @Test
    void theLimitOfFiveHundredItemsIsEnforced() {
        assertThatCode(() -> Item.requireRoomForAnother(499)).doesNotThrowAnyException();
        assertThatThrownBy(() -> Item.requireRoomForAnother(500)).isInstanceOf(ItemLimitReachedException.class);
    }
}
