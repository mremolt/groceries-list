import type { Item } from '../../domain/item';

/** A partial update; last write wins (ADR 0007). */
export interface ItemChange {
  readonly text?: string;
  readonly done?: boolean;
}

export interface UpdateItemPort {
  updateItem(listId: string, itemId: string, change: ItemChange): Promise<Item>;
}
