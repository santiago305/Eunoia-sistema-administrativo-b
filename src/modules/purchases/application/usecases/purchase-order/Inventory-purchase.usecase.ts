import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { Direction } from "src/shared/domain/value-objects/direction";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "src/modules/product-catalog/integration/inventory/ports/document.repository.port";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseOrderNotFoundApplicationError } from "../../errors/purchase-order-not-found.error";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { RegisterProductCatalogInventoryMovement } from "src/modules/product-catalog/application/usecases/register-inventory-movement.usecase";
import { SERIES_REPOSITORY, DocumentSeriesRepository } from "src/modules/product-catalog/integration/inventory/ports/document-series.repository.port";
import { InventoryDocument } from "src/modules/product-catalog/integration/inventory/entities/inventory-document";
import InventoryDocumentItem from "src/modules/product-catalog/integration/inventory/entities/inventory-document-item";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";

@Injectable()
export class PostInventoryFromPurchaseUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly purchaseItemRepo: PurchaseOrderItemRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly productCatalogStockItemRepo: ProductCatalogStockItemRepository,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
    private readonly registerProductCatalogMovement: RegisterProductCatalogInventoryMovement,
  ) {}

  async execute(params: {
    poId: string;
    toWarehouseId: string;
    toLocationId?: string;
    createdBy?: string;
    postedBy: string;
    note?: string;
    tx?: TransactionContext;
  }) {
    const { tx } = params;
    if (tx) {
      return this.executeInTx(params, tx);
    }
    return this.uow.runInTransaction(async (nextTx) => this.executeInTx(params, nextTx));
  }

  private async executeInTx(
    params: {
      poId: string;
      toWarehouseId: string;
      toLocationId?: string;
      createdBy?: string;
      postedBy: string;
      note?: string;
      tx?: TransactionContext;
    },
    tx: TransactionContext,
  ) {
    const order = await this.purchaseRepo.findById(params.poId, tx);
    if (!order) {
      throw new NotFoundException(new PurchaseOrderNotFoundApplicationError().message);
    }

    const items = await this.purchaseItemRepo.getByPurchaseId(
      order.poId,
      order.currency ?? CurrencyType.PEN,
      tx,
    );
    if (items.length === 0) {
      throw new BadRequestException("La orden no tiene items");
    }

    const series = await this.seriesRepo.findActiveFor(
      { docType: DocType.IN, warehouseId: params.toWarehouseId, isActive: true },
      tx,
    );
    if (!series.length) {
      throw new NotFoundException("No hay ninguna serie asociada");
    }

    const serie = series[0];
    const correlative = await this.seriesRepo.reserveNextNumber(serie.id, tx);

    const doc = await this.documentRepo.createDraft(
      new InventoryDocument(
        undefined,
        DocType.IN,
        DocStatus.DRAFT,
        serie.id,
        correlative,
        undefined,
        params.toWarehouseId,
        order.poId,
        ReferenceType.PURCHASE,
        params.note,
        params.createdBy,
      ),
      tx,
    );

    for (const item of items) {
      const skuStockItem = await this.productCatalogStockItemRepo.findById(item.stockItemId, tx);
      if (!skuStockItem) {
        throw new NotFoundException("Stock item de catalogo no encontrado");
      }

      await this.documentRepo.addItem(
        new InventoryDocumentItem(
          undefined,
          doc.id!,
          skuStockItem.id!,
          item.quantity * item.factor,
          0,
          undefined,
          params.toLocationId,
          item.unitPrice.getAmount(),
        ),
        tx,
      );

      await this.registerProductCatalogMovement.execute(
        {
          docType: DocType.IN,
          warehouseId: params.toWarehouseId,
          direction: Direction.IN,
          createdBy: params.postedBy,
          note: params.note,
          referenceId: order.poId,
          referenceType: ReferenceType.PURCHASE,
          items: [
            {
              skuId: skuStockItem.skuId,
              quantity: item.quantity * item.factor,
              unitCost: item.unitPrice.getAmount(),
              locationId: params.toLocationId ?? null,
            },
          ],
        },
        tx,
      );
    }

    await this.documentRepo.markPosted(
      {
        docId: doc.id!,
        postedBy: params.postedBy,
        postedAt: new Date(),
      },
      tx,
    );

    const savedDoc = await this.documentRepo.findById(doc.id!, tx);
    const savedItems = await this.documentRepo.listItems(doc.id!, tx);
    const docPayload = savedDoc
      ? {
          doc: {
            id: savedDoc.id!,
            docType: savedDoc.docType,
            status: savedDoc.status,
            serieId: savedDoc.serieId,
            correlative: savedDoc.correlative,
            fromWarehouseId: savedDoc.fromWarehouseId,
            toWarehouseId: savedDoc.toWarehouseId,
            referenceId: savedDoc.referenceId,
            referenceType: savedDoc.referenceType,
            note: savedDoc.note,
            createdBy: savedDoc.createdBy,
            postedBy: savedDoc.postedBy,
            postedAt: savedDoc.postedAt,
            createdAt: savedDoc.createdAt,
          },
          items: savedItems.map((i) => ({
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
      docId: doc.id!,
      document: docPayload,
    };
  }
}




