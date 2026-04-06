import DocumentSerie from "../entities/document-serie";
import { DocType } from "../value-objects/doc-type";

export class DocumentSerieFactory {
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
    return DocumentSerie.create(params);
  }
}
