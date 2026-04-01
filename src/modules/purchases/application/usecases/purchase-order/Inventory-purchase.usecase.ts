import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { CreateDocumentUseCase } from "src/modules/inventory/application/use-cases/document-inventory/create-document.usecase";
import { AddItemUseCase } from "src/modules/inventory/application/use-cases/document-item-inventory/add-item.usecase";
import { PostDocumentoIn } from "src/modules/inventory/application/use-cases/document-inventory/post-document-in.usecase";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { GetActiveDocumentSerieUseCase } from "src/modules/inventory/application/use-cases/document-serie/get-document-series.usecase";
import { ReferenceType } from "src/modules/inventory/domain/value-objects/reference-type";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "src/modules/inventory/application/ports/document.repository.port";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/application/ports/stock-item.repository.port";

@Injectable()
export class PostInventoryFromPurchaseUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly purchaseItemRepo: PurchaseOrderItemRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    private readonly createDocument: CreateDocumentUseCase,
    private readonly addItem: AddItemUseCase,
    private readonly postIn: PostDocumentoIn,
    private readonly getSerie: GetActiveDocumentSerieUseCase,
  ) {}

  async execute(params: {
    poId: string;
    toWarehouseId: string;
    toLocationId?: string;
    createdBy?: string;
    postedBy: string;
    note?: string;
  }) {
    return this.uow.runInTransaction(async () => {
      const order = await this.purchaseRepo.findById(params.poId);
      if (!order) {
        throw new NotFoundException({ type: "error", message: "Orden no encontrada" });
      }

      const items = await this.purchaseItemRepo.getByPurchaseId(order.poId);
      if (items.length === 0) {
        throw new BadRequestException({ type: "error", message: "La orden no tiene items" });
      }
      let serie;
      try {
        serie = await this.getSerie.execute
        ({ docType: DocType.IN, warehouseId: params.toWarehouseId })
      } catch {
        throw new NotFoundException({type:"error", message:"No hay ninguna serie asociada"})
      }
      if (!serie.items || serie.items.length === 0) {
        throw new NotFoundException({ type: "error", message: "No hay ninguna serie asociada" });
      }

      const serieId = serie.items[0].id;

      const doc = await this.createDocument.execute({
        docType: DocType.IN,
        serieId: serieId,
        toWarehouseId: params.toWarehouseId,
        referenceId: order.poId,
        referenceType: ReferenceType.PURCHASE,
        note: params.note,
        createdBy: params.createdBy,
      });

      for (const item of items) {
        let stockItem = await this.stockItemRepo.findById(item.stockItemId);
        if (!stockItem) {
          stockItem = await this.stockItemRepo.findByProductIdOrVariantId(item.stockItemId);
        }
        if (!stockItem) {
          throw new NotFoundException({ type: "error", message: "StockItem terminado no encontrado" });
        }
        await this.addItem.execute({
          docId: doc.id,
          stockItemId: stockItem.stockItemId,
          quantity: item.quantity * item.factor,
          toLocationId: params.toLocationId,
          unitCost: item.unitPrice.getAmount(), // o item.purchaseValue.getAmount()
        });
      }

      await this.postIn.execute({
        docId: doc.id,
        postedBy: params.postedBy,
        note: params.note,
      });

      const docResult = await this.documentRepo.getByIdWithItems(doc.id);
      const docPayload = docResult
        ? {
            doc: {
              id: docResult.doc.id!,
              docType: docResult.doc.docType,
              status: docResult.doc.status,
              serieId: docResult.doc.serieId,
              correlative: docResult.doc.correlative,
              fromWarehouseId: docResult.doc.fromWarehouseId,
              toWarehouseId: docResult.doc.toWarehouseId,
              referenceId: docResult.doc.referenceId,
              referenceType: docResult.doc.referenceType,
              note: docResult.doc.note,
              createdBy: docResult.doc.createdBy,
              postedBy: docResult.doc.postedBy,
              postedAt: docResult.doc.postedAt,
              createdAt: docResult.doc.createdAt,
            },
            items: docResult.items.map((i) => ({
              id: i.id!,
              docId: i.docId,
              stockItemId: i.stockItemId,
              quantity: i.quantity,
              fromLocationId: i.fromLocationId,
              toLocationId: i.toLocationId,
              unitCost: i.unitCost ?? null,
            })),
          }
        : undefined;

      return {
        type: "success",
        message: "Documento IN posteado desde compra",
        docId: doc.id,
        document: docPayload,
      };
    });
  }
}
