package de.tantive.groceries.ports.in;

/** Provider-initiated: no caller (SPRING-SEC-40). */
public interface EndIdpSessionsUseCase {

    void end(EndIdpSessionsCommand command);
}
