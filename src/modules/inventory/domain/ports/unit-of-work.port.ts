export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

export interface TransactionContext {}

export interface UnitOfWork {
  runInTransaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
