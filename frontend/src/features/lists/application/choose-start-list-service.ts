import type { ShoppingList } from '../domain/shopping-list';
import { chooseStartListId } from '../domain/start-list';
import type { ChooseStartListUseCase } from '../ports/in/choose-start-list-use-case';
import type { OpenedListMemoryPort } from '../ports/out/opened-list-memory-port';

export class ChooseStartListService implements ChooseStartListUseCase {
  constructor(private readonly memory: OpenedListMemoryPort) {}

  execute(lists: readonly ShoppingList[]): string | null {
    return chooseStartListId(lists, this.memory.recall());
  }
}
