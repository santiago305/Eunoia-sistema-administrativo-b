export class CompanyNotFoundError extends Error {
  constructor() {
    super("Empresa no encontrada");
    this.name = "CompanyNotFoundError";
  }
}