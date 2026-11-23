package de.tantive.groceries.application.accounts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.tantive.groceries.ports.out.IdentityProviderPort;
import de.tantive.groceries.ports.out.IdentityProviderUnavailableException;
import de.tantive.groceries.ports.out.PendingIdpDeletionPort;
import java.util.List;
import org.junit.jupiter.api.Test;

class RetryIdpDeletionsServiceTest {

    private final PendingIdpDeletionPort pending = mock(PendingIdpDeletionPort.class);
    private final IdentityProviderPort identityProvider = mock(IdentityProviderPort.class);
    private final RetryIdpDeletionsService service = new RetryIdpDeletionsService(pending, identityProvider);

    @Test
    void deletesTheOpenOnesAndForgetsThem() throws Exception {
        when(pending.oldest(eq(50))).thenReturn(List.of("sub-1", "sub-2"));

        assertThat(service.retryPendingDeletions()).isEqualTo(2);

        verify(pending).remove("sub-1");
        verify(pending).remove("sub-2");
    }

    @Test
    void keepsTheOnesThatFailAndStopsAtTheFirstOutage() throws Exception {
        when(pending.oldest(eq(50))).thenReturn(List.of("sub-1", "sub-2"));
        doThrow(new IdentityProviderUnavailableException("down"))
                .when(identityProvider)
                .deleteUser("sub-1");

        assertThat(service.retryPendingDeletions()).isZero();

        verify(pending, never()).remove("sub-1");
        verify(identityProvider, never()).deleteUser("sub-2");
    }
}
