export class SourceNotFoundError extends Error {
  constructor(message: string = "Fuente no encontrada") {
    super(message);
    this.name = "SourceNotFoundError";
  }
}

