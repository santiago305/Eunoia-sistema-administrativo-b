export class MissingProductIdError extends Error {
  constructor(message: string = 'ProductId requerido para mapear User') {
    super(message);
    this.name = 'MissingProductIdError';
  }
}
