package de.tantive.groceries.ports.in;

/** Remembers which application session belongs to which IdP session (SPRING-SEC-40). */
public interface RegisterIdpSessionUseCase {

    void register(RegisterIdpSessionCommand command);
}
