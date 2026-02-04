export class InvalidSessionIdError extends Error {
  constructor() {
    super('Session id invalido');
    this.name = 'InvalidSessionIdError';
  }
}
