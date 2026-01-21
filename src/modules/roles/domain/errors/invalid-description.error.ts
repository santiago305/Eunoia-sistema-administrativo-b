export class InvalidDescriptionError extends Error {
  constructor(message: string = 'Descripción inválida') {
    super(message);
    this.name = 'InvalidDescriptionError';
  }
}
