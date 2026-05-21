export class InvalidClientError extends Error {
  constructor(message: string = "Cliente invalido") {
    super(message);
    this.name = "InvalidClientError";
  }
}

