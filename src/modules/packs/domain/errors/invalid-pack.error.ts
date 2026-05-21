export class InvalidPackError extends Error {
  constructor(message: string = "Pack invalido") {
    super(message);
    this.name = "InvalidPackError";
  }
}

