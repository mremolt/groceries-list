package de.tantive.groceries.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Chicago style: the list aggregate and the limit rule of BR-12 as plain functions (TEST-ARCH-01). */
class ShoppingListTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private static final UUID CREATOR = UUID.fromString("00000000-0000-4000-8000-000000000001");

    @Test
    void aNewListStartsAtRevisionZeroWithItsCreator() {
        UUID id = UUID.randomUUID();

        ShoppingList list = ShoppingList.create(id, ListName.of("Wocheneinkauf"), CREATOR, NOW);

        assertThat(list.id()).isEqualTo(id);
        assertThat(list.name().value()).isEqualTo("Wocheneinkauf");
        assertThat(list.createdBy()).isEqualTo(CREATOR);
        assertThat(list.createdAt()).isEqualTo(NOW);
        assertThat(list.updatedAt()).isEqualTo(NOW);
        assertThat(list.revision()).isZero();
    }

    @Test
    void renamingChangesTheNameAndTheUpdateTimeOnly() {
        ShoppingList list = ShoppingList.create(UUID.randomUUID(), ListName.of("WG"), CREATOR, NOW);

        ShoppingList renamed = list.renamed(ListName.of("WG-Vorrat"), NOW.plusSeconds(60));

        assertThat(renamed.name().value()).isEqualTo("WG-Vorrat");
        assertThat(renamed.updatedAt()).isEqualTo(NOW.plusSeconds(60));
        assertThat(renamed.createdAt()).isEqualTo(NOW);
        assertThat(renamed.id()).isEqualTo(list.id());
    }

    @Test
    void aUserMayHaveUpToOneHundredLists() {
        assertThatCode(() -> ShoppingList.requireRoomForAnother(99)).doesNotThrowAnyException();
    }

    @Test
    void theHundredAndFirstListIsRefusedWithAStableCode() {
        assertThatThrownBy(() -> ShoppingList.requireRoomForAnother(100))
                .isInstanceOfSatisfying(ListLimitReachedException.class, e -> {
                    assertThat(e.code()).isEqualTo("LIST_LIMIT_REACHED");
                    assertThat(e).isInstanceOf(ConflictException.class);
                });
    }

    @Test
    void aListMayHaveUpToFiftyMembers() {
        assertThatCode(() -> ShoppingList.requireRoomForAnotherMember(49)).doesNotThrowAnyException();
    }

    @Test
    void theFiftyFirstMemberIsRefusedWithAStableCode() {
        assertThatThrownBy(() -> ShoppingList.requireRoomForAnotherMember(50))
                .isInstanceOfSatisfying(MemberLimitReachedException.class, e -> {
                    assertThat(e.code()).isEqualTo("MEMBER_LIMIT_REACHED");
                    assertThat(e).isInstanceOf(ConflictException.class);
                });
    }
}
