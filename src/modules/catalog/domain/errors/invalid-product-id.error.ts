export class InvalidProductIdError extends Error {
  constructor(message = "ProductId is invalid", cause?: unknown) {
    super(message);
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
    this.name = "InvalidProductIdError";
  }
}
