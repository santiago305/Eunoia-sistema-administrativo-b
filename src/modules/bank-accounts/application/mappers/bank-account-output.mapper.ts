import { BankAccount } from "src/modules/bank-accounts/domain/entity/bank-account";

export class BankAccountOutputMapper {
  static toOutput(account: BankAccount) {
    return {
      id: account.bankAccountId,
      companyId: account.companyId,
      name: account.name,
      number: account.number,
      isActive: account.isActive,
    };
  }
}

