export abstract class ProductCatalogInfrastructureError extends Error {
  abstract readonly code: string;
  abstract readonly identifier: string;
  readonly layer = "infrastructure";

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
