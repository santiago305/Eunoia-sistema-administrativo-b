import { NotFoundException } from "@nestjs/common";
import { InventoryDocument } from "src/modules/inventory/domain/entities/inventory-document";
import { ReferenceType } from "src/modules/inventory/domain/value-objects/reference-type";
import { DocStatus } from "src/modules/inventory/domain/value-objects/doc-status";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { DocumentSeriesRepository } from "src/modules/inventory/application/ports/document-series.repository.port";
import { DocumentRepository } from "src/modules/inventory/application/ports/document.repository.port";

export type CreateDraftDocumentParams = {
  docType: DocType;
  serieWarehouseId: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  referenceId?: string;
  referenceType?: ReferenceType;
  note?: string;
  createdBy?: string;
};

export type CreateDraftDocumentDeps = {
  seriesRepo: DocumentSeriesRepository;
  documentRepo: DocumentRepository;
};

export async function createDraftDocument(
  params: CreateDraftDocumentParams,
  deps: CreateDraftDocumentDeps,
  tx: TransactionContext,
): Promise<InventoryDocument> {
  const series = await deps.seriesRepo.findActiveFor(
    {
      docType: params.docType,
      warehouseId: params.serieWarehouseId,
      isActive: true,
    },
    tx,
  );

  if (!series || series.length === 0) {
    throw new NotFoundException("Serie activa no encontrada");
  }

  const serie = series[0];
  const correlative = await deps.seriesRepo.reserveNextNumber(serie.id, tx);

  const doc = new InventoryDocument(
    undefined,
    params.docType,
    DocStatus.DRAFT,
    serie.id,
    correlative,
    params.fromWarehouseId,
    params.toWarehouseId,
    params.referenceId,
    params.referenceType,
    params.note,
    params.createdBy,
  );

  return deps.documentRepo.createDraft(doc, tx);
}
