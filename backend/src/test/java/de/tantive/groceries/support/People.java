package de.tantive.groceries.support;

import de.tantive.groceries.domain.Caller;
import java.util.UUID;

/**
 * Fictitious people for tests (DP-ENV-01, SPRING-TEST-14): one per role, with fixed ids so assertions and failure
 * messages stay readable. Names and addresses are invented and use the reserved {@code example.test} domain. Adapt the
 * {@code caller(...)} factory to the product's {@link Caller} record (SPRING-SEC-39) and add one method per role.
 */
public final class People {

    public static final UUID ALICE_ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
    public static final UUID BOB_ID = UUID.fromString("00000000-0000-4000-8000-000000000002");

    private People() {}

    /** An ordinary user: "user A" of the cross-user tests (SPRING-SEC-16). */
    public static Caller alice() {
        return caller(ALICE_ID, "sub-alice", "alice@example.test", "Alice Example");
    }

    /** Another ordinary user: "user B" of the cross-user tests. */
    public static Caller bob() {
        return caller(BOB_ID, "sub-bob", "bob@example.test", "Bob Example");
    }

    private static Caller caller(UUID id, String subject, String email, String name) {
        // No roles: all members of a list are equal (BR-02).
        return new Caller(id, subject, email, name);
    }
}
