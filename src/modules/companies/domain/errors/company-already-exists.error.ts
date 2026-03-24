export class CompanyAlreadyExistsError extends Error {
  constructor() {
    super("Ya existe una empresa con los datos proporcionados");
    this.name = "CompanyAlreadyExistsError";
  }
}