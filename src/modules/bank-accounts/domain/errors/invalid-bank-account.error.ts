export class InvalidBankAccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBankAccountError";
  }
}

