export class AgencyNotFoundError extends Error {
  constructor(message: string = "Agencia no encontrada") {
    super(message);
    this.name = "AgencyNotFoundError";
  }
}

