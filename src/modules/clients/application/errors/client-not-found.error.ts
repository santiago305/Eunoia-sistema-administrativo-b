export class ClientNotFoundError extends Error {
  constructor(message: string = "Cliente no encontrado") {
    super(message);
    this.name = "ClientNotFoundError";
  }
}

