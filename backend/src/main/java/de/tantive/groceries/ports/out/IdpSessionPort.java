package de.tantive.groceries.ports.out;

import java.time.Instant;

/** The map from IdP sessions to application sessions and the ending of those sessions (SPRING-SEC-40). */
public interface IdpSessionPort {

    void record(String sessionId, String sid, String subject, Instant now);

    void purgeRecordedBefore(Instant cutoff);

    void endBySid(String sid);

    void endBySubject(String subject);
}
