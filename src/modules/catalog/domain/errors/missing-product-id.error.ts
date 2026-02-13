export class MissingProductIdError extends Error {
  constructor(message: string = "ProductId is required") {
    super(message);
    this.name = "MissingProductIdError";
  }
}
