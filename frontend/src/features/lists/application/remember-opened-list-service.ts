import type { RememberOpenedListUseCase } from '../ports/in/remember-opened-list-use-case';
import type { OpenedListMemoryPort } from '../ports/out/opened-list-memory-port';

export class RememberOpenedListService implements RememberOpenedListUseCase {
  constructor(private readonly memory: OpenedListMemoryPort) {}

  execute(id: string): void {
    this.memory.remember(id);
  }
}
