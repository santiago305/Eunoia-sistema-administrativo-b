import { DocType } from "src/shared/domain/value-objects/doc-type";

export class ProductCatalogDocumentSerie {
  private constructor(
    public readonly id: string | undefined,
    public readonly code: string,
    public readonly name: string,
    public readonly docType: DocType,
    public readonly warehouseId: string,
    public readonly nextNumber: number,
    public readonly padding: number,
    public readonly separator: string,
    public readonly isActive: boolean,
    public readonly createdAt?: Date,
  ) {}

  static create(params: {
    id?: string;
    code: string;
    name: string;
    docType: DocType;
    warehouseId: string;
    nextNumber?: number;
    padding?: number;
    separator?: string;
    isActive?: boolean;
    createdAt?: Date;
  }) {
    const code = params.code?.trim();
    const name = params.name?.trim();
    const warehouseId = params.warehouseId?.trim();
    const separator = params.separator?.trim() || "-";

    if (!code) throw new Error("El codigo de serie es obligatorio");
    if (!name) throw new Error("El nombre de serie es obligatorio");
    if (!params.docType) throw new Error("El tipo de documento es obligatorio");
    if (!warehouseId) throw new Error("El almacen es obligatorio");

    return new ProductCatalogDocumentSerie(
      params.id,
      code,
      name,
      params.docType,
      warehouseId,
      params.nextNumber ?? 1,
      params.padding ?? 6,
      separator,
      params.isActive ?? true,
      params.createdAt ?? new Date(),
    );
  }
}
