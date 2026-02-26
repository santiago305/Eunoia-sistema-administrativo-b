import { EntityManager } from 'typeorm';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';

export class TypeormTransactionContext implements TransactionContext {
  constructor(public readonly manager: EntityManager) {}
}
