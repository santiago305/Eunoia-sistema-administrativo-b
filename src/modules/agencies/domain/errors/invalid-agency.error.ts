export class InvalidAgencyError extends Error {
  constructor(message: string = "Agencia invalida") {
    super(message);
    this.name = "InvalidAgencyError";
  }
}

