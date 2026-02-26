import { EntityManager } from 'typeorm';
import { TransactionContext } from './transaction-context.port';

export class TypeormTransactionContext implements TransactionContext {
  constructor(public readonly manager: EntityManager) {}
}
