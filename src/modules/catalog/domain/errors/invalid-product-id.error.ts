export class InvalidProductIdError extends Error {
  constructor(message: string = 'ProductId invalido') {
    super(message);
    this.name = 'InvalidProductIdError';
  }
}
