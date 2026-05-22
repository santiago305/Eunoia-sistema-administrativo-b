export class DuplicatePackItemSkuError extends Error {
  constructor(message: string = "No puedes repetir el mismo SKU en el pack") {
    super(message);
    this.name = "DuplicatePackItemSkuError";
  }
}

