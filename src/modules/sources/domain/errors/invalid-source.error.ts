export class InvalidSourceError extends Error {
  constructor(message: string = "Fuente invalida") {
    super(message);
    this.name = "InvalidSourceError";
  }
}

