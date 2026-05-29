import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { BankAccount } from "../entity/bank-account";

export const BANK_ACCOUNT_REPOSITORY = Symbol("BANK_ACCOUNT_REPOSITORY");

export interface BankAccountRepository {
  findById(bankAccountId: string, tx?: TransactionContext): Promise<BankAccount | null>;
  listByCompany(companyId: string, tx?: TransactionContext): Promise<BankAccount[]>;
  findDuplicate(companyId: string, number: string, tx?: TransactionContext): Promise<BankAccount | null>;
  create(account: BankAccount, tx?: TransactionContext): Promise<BankAccount>;
  update(
    params: {
      bankAccountId: string;
      name?: string;
      number?: string | null;
    },
    tx?: TransactionContext,
  ): Promise<BankAccount | null>;
  setActive(bankAccountId: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
}

