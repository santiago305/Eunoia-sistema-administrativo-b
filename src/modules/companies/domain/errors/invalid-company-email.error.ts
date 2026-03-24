export class InvalidCompanyEmailError extends Error {
  constructor() {
    super("El correo electrónico de la empresa es inválido");
    this.name = "InvalidCompanyEmailError";
  }
}