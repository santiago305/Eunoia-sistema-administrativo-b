export class InvalidEmailError extends Error {
  constructor(message: string = 'Email invalido') {
    super(message);
    this.name = 'InvalidEmailError';
  }
}
