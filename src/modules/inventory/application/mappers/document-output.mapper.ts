import { DocumentDetailOutput } from "../dto/document/output/document-detail-out";
import { DocumentOutput } from "../dto/document/output/document-out";
import { PaginatedDocumentOutputResult } from "../dto/document/output/document-paginated";
import { ItemOutput } from "../dto/document-item/output/item-out";
import { InventoryDocument } from "../../domain/entities/inventory-document";
import InventoryDocumentItem from "../../domain/entities/inventory-document-item";

export class DocumentOutputMapper {
  static toDocumentOutput(doc: InventoryDocument): DocumentOutput {
    return {
      id: doc.id!,
      docType: doc.docType,
      status: doc.status,
      serie: "",
      correlative: doc.correlative,
      createdAt: doc.createdAt,
    };
  }

  static toItemOutput(item: InventoryDocumentItem): ItemOutput {
    return {
      id: item.id!,
      docId: item.docId,
      stockItemId: item.stockItemId,
      quantity: item.quantity,
      wasteQty: item.wasteQty ?? 0,
      unitCost: item.unitCost ?? null,
      fromLocationId: item.fromLocationId,
      toLocationId: item.toLocationId,
    };
  }

  static toDetailOutput(params: {
    doc: InventoryDocument;
    serieCode: string;
    items: InventoryDocumentItem[];
  }): DocumentDetailOutput {
    return {
      doc: {
        id: params.doc.id!,
        docType: params.doc.docType,
        status: params.doc.status,
        serie: params.serieCode,
        correlative: params.doc.correlative,
        createdAt: params.doc.createdAt,
      },
      items: params.items.map((item) => this.toItemOutput(item)),
    };
  }

  static toPaginatedOutput(params: {
    items: PaginatedDocumentOutputResult["items"];
    total: number;
    page: number;
    limit: number;
  }): PaginatedDocumentOutputResult {
    return {
      items: params.items,
      total: params.total,
      page: params.page,
      limit: params.limit,
    };
  }
}
