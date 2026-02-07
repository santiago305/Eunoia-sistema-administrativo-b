import { TransactionContext } from '../../../../domain/ports/unit-of-work.port';
import { EntityManager } from 'typeorm';

export class TypeormTransactionContext implements TransactionContext {
  constructor(public readonly manager: EntityManager) {}
}
