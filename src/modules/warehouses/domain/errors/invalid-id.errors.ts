export class InvalidIdError extends Error {
  constructor(message: string = 'Id invalido') {
    super(message);
    this.name = 'InvalidIdError';
  }
}
