package de.tantive.groceries.application.lists;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.ListLimitReachedException;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.domain.Membership;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.in.CreateListCommand;
import de.tantive.groceries.ports.out.MembershipPort;
import de.tantive.groceries.ports.out.SaveListPort;
import de.tantive.groceries.support.People;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** London style: the use case with its outgoing ports as doubles (TEST-ARCH-02). */
class CreateListServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private final MembershipPort memberships = mock(MembershipPort.class);
    private final SaveListPort saveList = mock(SaveListPort.class);
    private final CreateListService service =
            new CreateListService(memberships, saveList, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void createsTheListAndMakesTheCallerItsOnlyMember() {
        when(memberships.lockAndCountListsOf(People.ALICE_ID)).thenReturn(0);
        when(saveList.create(any(ShoppingList.class))).thenAnswer(call -> call.getArgument(0));

        ListSummary summary = service.createList(new CreateListCommand(People.alice(), ListName.of(" Wocheneinkauf ")));

        ArgumentCaptor<ShoppingList> created = ArgumentCaptor.forClass(ShoppingList.class);
        verify(saveList).create(created.capture());
        assertThat(created.getValue().name().value()).isEqualTo("Wocheneinkauf");
        assertThat(created.getValue().createdBy()).isEqualTo(People.ALICE_ID);
        verify(memberships)
                .add(new Membership(People.ALICE_ID, created.getValue().id(), NOW));
        assertThat(summary).isEqualTo(new ListSummary(created.getValue().id(), "Wocheneinkauf", 0, 0));
    }

    @Test
    void refusesAHundredAndFirstListWithoutCreatingAnything() {
        when(memberships.lockAndCountListsOf(People.ALICE_ID)).thenReturn(100);

        assertThatThrownBy(() -> service.createList(new CreateListCommand(People.alice(), ListName.of("Noch eine"))))
                .isInstanceOf(ListLimitReachedException.class);

        verify(saveList, never()).create(any());
        verify(memberships, never()).add(any());
    }
}
