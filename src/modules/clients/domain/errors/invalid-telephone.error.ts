export class InvalidTelephoneError extends Error {
  constructor(message: string = "Telefono invalido") {
    super(message);
    this.name = "InvalidTelephoneError";
  }
}

