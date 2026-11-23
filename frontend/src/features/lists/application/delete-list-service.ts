import type { DeleteListUseCase } from '../ports/in/delete-list-use-case';
import type { DeleteListPort } from '../ports/out/delete-list-port';

export class DeleteListService implements DeleteListUseCase {
  constructor(private readonly port: DeleteListPort) {}

  execute(id: string): Promise<void> {
    return this.port.deleteList(id);
  }
}
