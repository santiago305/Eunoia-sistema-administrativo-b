export class SupplierMethod {
  constructor(
    public readonly supplierId: string,
    public readonly methodId: string,
    public readonly number?: string,
  ) {}
}
