import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { GetLedgerInput } from '../../dto/ledger/input/get-ledger';
import { PaginatedLedgerResult } from '../../dto/ledger/output/paginated-ledger';
import { ReferenceType } from 'src/modules/inventory/domain/value-objects/reference-type';
import { LEDGER_REPOSITORY, LedgerRepository } from '../../ports/ledger.repository.port';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from '../../ports/stock-item.repository.port';


@Injectable()
export class GetLedgerUseCase {
  constructor(
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
  ) {}

  async execute(input: GetLedgerInput): Promise<PaginatedLedgerResult> {

    // if(!input.warehouseId){
    //   throw new BadRequestException('Debes elegir un almacen');
    // }
    // if(!input.stockItemId){
    //   throw new BadRequestException('Debes elegir un producto');
    // }
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 20;
    let stockItemId = input.stockItemId;
    if (stockItemId) {
      const stockItem = await this.stockItemRepo.findByProductIdOrVariantId(stockItemId);
      if (stockItem?.stockItemId) {
        stockItemId = stockItem.stockItemId;
      }
    }
    const { items, total } = await this.ledgerRepo.list({
      ...input,
      stockItemId,
      page,
      limit,
    });
    
    const balances = await this.ledgerRepo.getBalances({
      ...input,
      stockItemId,
    });

    const ordered = items

    const balanceById = new Map<string, number>();
    const usesDbBalance =
      ordered.length > 0 && ordered.every((e) => typeof e.balance === "number");
    let running = balances.balanceInicial;

    if (usesDbBalance) {
      for (const e of ordered) {
        if (!e.id) continue;
        const base = e.balance ?? 0;
        balanceById.set(e.id, base + balances.balanceInicial);
      }
    } else {
      for (const e of ordered) {
        const delta = e.direction === "IN" ? e.quantity : -e.quantity;
        running += delta;
        if (e.id) balanceById.set(e.id, running);
      }
    }

    return {
      items: ordered.map((e) => {
        const document = e.document
          ? {
              id: e.document.id,
              docType: e.document.docType,
              status: e.document.status,
              serieId: e.document.serieId,
              serie: e.document.serie ?? null,
              correlative: e.document.correlative,
              fromWarehouseId: e.document.fromWarehouseId,
              toWarehouseId: e.document.toWarehouseId,
              fromWarehouse: e.document.fromWarehouse ?? null,
              toWarehouse: e.document.toWarehouse ?? null,
              referenceId: e.document.referenceId,
              referenceType: e.document.referenceType,
              createdBy: e.document.createdBy,
              
            }
          : undefined;

        const stockItem = e.stockItem
          ? {
              id: e.stockItem.id,
              type: e.stockItem.type,
              productId: e.stockItem.productId ?? null,
              variantId: e.stockItem.variantId ?? null,
              product: e.stockItem.product
                ? {
                    id: e.stockItem.product.id,
                    name: e.stockItem.product.name,
                    sku: e.stockItem.product.sku,
                    unidad: e.stockItem.product.unidad,
                  }
                : null,
              variant: e.stockItem.variant
                ? {
                    id: e.stockItem.variant.id,
                    productId: e.stockItem.variant.productId,
                    name: e.stockItem.variant.name,
                    sku: e.stockItem.variant.sku,
                    unidad: e.stockItem.variant.unidad,
                  }
                : null,
            }
          : undefined;

        let referenceDoc = undefined;
        if (e.referenceDoc?.type === ReferenceType.PURCHASE) {
          referenceDoc = {
            type: ReferenceType.PURCHASE,
            purchase: {
              id: e.referenceDoc.purchase.id,
              supplierId: e.referenceDoc.purchase.supplierId,
              warehouseId: e.referenceDoc.purchase.warehouseId,
              documentType: e.referenceDoc.purchase.documentType ?? null,
              serie: e.referenceDoc.purchase.serie ?? null,
              correlative: e.referenceDoc.purchase.correlative ?? null,
              expectedAt: e.referenceDoc.purchase.expectedAt ?? null,
              dateIssue: e.referenceDoc.purchase.dateIssue ?? null,
              dateExpiration: e.referenceDoc.purchase.dateExpiration ?? null,
              createdAt: e.referenceDoc.purchase.createdAt,
            },
            supplier: e.referenceDoc.supplier,
            createdBy: e.referenceDoc.createdBy,
          };
        } else if (e.referenceDoc?.type === ReferenceType.PRODUCTION) {
          referenceDoc = {
            type: ReferenceType.PRODUCTION,
            production: {
              id: e.referenceDoc.production.id,
              fromWarehouseId: e.referenceDoc.production.fromWarehouseId,
              toWarehouseId: e.referenceDoc.production.toWarehouseId,
              docType: e.referenceDoc.production.docType,
              serieId: e.referenceDoc.production.serieId,
              serie: e.referenceDoc.production.serie ?? null,
              correlative: e.referenceDoc.production.correlative,
              status: e.referenceDoc.production.status,
              reference: e.referenceDoc.production.reference ?? null,
              manufactureDate: e.referenceDoc.production.manufactureDate,
              createdBy: e.referenceDoc.production.createdBy,
              updatedBy: e.referenceDoc.production.updatedBy ?? undefined,
              createdAt: e.referenceDoc.production.createdAt,
              updatedAt: e.referenceDoc.production.updatedAt,
            },
            createdBy: e.referenceDoc.createdBy,
          };
        }

        return {
          id: e.id!,
          docId: e.docId,
          document,
          referenceDoc,
          stockItem,
          locationId: e.locationId,
          stockItemId: e.stockItemId,
          direction: e.direction,
          quantity: e.quantity,
          wasteQty: e.wasteQty ?? null,
          unitCost: e.unitCost ?? null,
          createdAt: e.createdAt,
          balance: e.id ? balanceById.get(e.id) : running,
        };
      }),
      total,
      page,
      limit,
      balances,
    };
    }
  }
