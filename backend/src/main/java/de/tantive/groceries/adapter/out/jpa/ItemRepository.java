package de.tantive.groceries.adapter.out.jpa;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ItemRepository extends JpaRepository<ItemEntity, UUID> {}
