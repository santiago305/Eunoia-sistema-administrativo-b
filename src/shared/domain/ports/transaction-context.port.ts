export const UNIT_OF_WORK_SHARED = Symbol('UNIT_OF_WORK_SHARED');

export interface TransactionContext {}

export interface UnitOfWorkShared {
  runInTransaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
