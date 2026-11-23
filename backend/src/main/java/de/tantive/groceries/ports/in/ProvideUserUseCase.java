package de.tantive.groceries.ports.in;

/** Creates the account at the first login and records later logins (ADR 0002). */
public interface ProvideUserUseCase {

    ProvideUserResult provide(ProvideUserCommand command);
}
