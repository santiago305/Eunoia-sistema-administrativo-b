export class BankAccountNotFoundError extends Error {
  constructor() {
    super("Cuenta bancaria no encontrada");
    this.name = "BankAccountNotFoundError";
  }
}

