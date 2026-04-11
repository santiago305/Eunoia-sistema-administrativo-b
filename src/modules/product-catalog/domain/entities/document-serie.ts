import { DocType } from "src/shared/domain/value-objects/doc-type";
import { DocumentSerieCodeRequiredError } from "../errors/document-serie-code-required.error";
import { DocumentSerieDocTypeRequiredError } from "../errors/document-serie-doc-type-required.error";
import { DocumentSerieNameRequiredError } from "../errors/document-serie-name-required.error";
import { DocumentSerieWarehouseRequiredError } from "../errors/document-serie-warehouse-required.error";

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

    if (!code) throw new DocumentSerieCodeRequiredError();
    if (!name) throw new DocumentSerieNameRequiredError();
    if (!params.docType) throw new DocumentSerieDocTypeRequiredError();
    if (!warehouseId) throw new DocumentSerieWarehouseRequiredError();

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
