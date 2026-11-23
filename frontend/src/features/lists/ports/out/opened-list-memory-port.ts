/** Remembers the list opened last on this device (FR-NAV-03 AC1). It is a list id, never a token or personal data. */
export interface OpenedListMemoryPort {
  recall(): string | null;
  remember(id: string): void;
}
