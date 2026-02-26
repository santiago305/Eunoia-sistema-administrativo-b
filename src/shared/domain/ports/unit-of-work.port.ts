import { TransactionContext } from './transaction-context.port';
export type { TransactionContext } from './transaction-context.port';

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

export interface UnitOfWork {
  runInTransaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
