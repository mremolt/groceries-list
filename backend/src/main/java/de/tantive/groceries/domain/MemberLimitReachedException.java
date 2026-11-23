package de.tantive.groceries.domain;

/** The list already has the maximum number of members (BR-12, FR-SHARE-03 AC4). */
public final class MemberLimitReachedException extends ConflictException {

    public MemberLimitReachedException() {
        super("MEMBER_LIMIT_REACHED", "Diese Liste hat die maximale Anzahl an Mitgliedern erreicht.");
    }
}
