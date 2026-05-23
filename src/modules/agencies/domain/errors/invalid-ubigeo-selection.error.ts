export class InvalidUbigeoSelectionError extends Error {
  constructor(message: string = "Ubigeo no coincide") {
    super(message);
    this.name = "InvalidUbigeoSelectionError";
  }
}

