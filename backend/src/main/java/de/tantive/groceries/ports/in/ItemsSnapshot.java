package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Item;
import java.util.List;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The items of a list at one revision (ADR 0006). When the caller already holds that revision the items are left out
 * ({@link #notModified()}) and were never read (NFR-PERF-04).
 */
public record ItemsSnapshot(long revision, @Nullable List<Item> items) {

    public ItemsSnapshot {
        if (items != null) {
            items = List.copyOf(items);
        }
    }

    public static ItemsSnapshot changed(long revision, List<Item> items) {
        return new ItemsSnapshot(revision, Objects.requireNonNull(items, "items"));
    }

    public static ItemsSnapshot unchanged(long revision) {
        return new ItemsSnapshot(revision, null);
    }

    public boolean notModified() {
        return items == null;
    }

    /** The items of a changed snapshot. */
    public List<Item> requireItems() {
        return Objects.requireNonNull(items, "snapshot is not modified");
    }
}
