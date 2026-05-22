export class TelephoneNotFoundError extends Error {
  constructor(message: string = "Telefono no encontrado") {
    super(message);
    this.name = "TelephoneNotFoundError";
  }
}

