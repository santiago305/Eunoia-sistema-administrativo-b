export class InvalidUbigeoSelectionError extends Error {
  constructor(message: string = "Ubigeo invalido") {
    super(message);
    this.name = "InvalidUbigeoSelectionError";
  }
}

