export class InvalidPackItemError extends Error {
  constructor(message: string = "Item de pack invalido") {
    super(message);
    this.name = "InvalidPackItemError";
  }
}

