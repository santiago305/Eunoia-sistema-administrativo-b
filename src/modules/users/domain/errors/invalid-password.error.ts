export class InvalidPasswordError extends Error {
  constructor(message: string = 'Password invalida') {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}
