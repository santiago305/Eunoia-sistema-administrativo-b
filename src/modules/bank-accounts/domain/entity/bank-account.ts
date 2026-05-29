import { InvalidBankAccountError } from "../errors/invalid-bank-account.error";

export class BankAccount {
  private constructor(
    public readonly bankAccountId: string | undefined,
    public readonly companyId: string,
    public readonly name: string,
    public readonly number: string | null,
    public readonly isActive: boolean,
  ) {}

  static create(params: {
    bankAccountId?: string;
    companyId: string;
    name: string;
    number?: string | null;
    isActive?: boolean;
  }) {
    const companyId = params.companyId?.trim();
    if (!companyId) throw new InvalidBankAccountError("companyId es requerido");

    const name = params.name?.trim();
    if (!name) throw new InvalidBankAccountError("name es requerido");

    const normalizedNumber = params.number === undefined || params.number === null ? null : params.number.trim();
    const number = normalizedNumber ? normalizedNumber : null;

    return new BankAccount(
      params.bankAccountId,
      companyId,
      name,
      number,
      params.isActive ?? true,
    );
  }
}

