package de.tantive.groceries.ports.out;

import java.util.UUID;

/** Erases an account row; its memberships go with it (SPRING-DP-03). */
public interface DeleteUserPort {

    void delete(UUID userId);
}
