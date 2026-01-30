export class InvalidUserIdError extends Error {
  constructor(message: string = 'UserId invalido') {
    super(message);
    this.name = 'InvalidUserIdError';
  }
}
