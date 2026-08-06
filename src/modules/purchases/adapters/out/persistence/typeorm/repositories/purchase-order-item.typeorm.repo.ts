import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { PurchaseOrderItem } from "src/modules/purchases/domain/entities/purchase-order-item";
import {
  PurchaseOrderItemRepository,
  PurchaseOrderItemSummary,
} from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PurchaseOrderItemEntity } from "../entities/purchase-order-item.entity";
import { PurchaseOrderItemMapper } from "../mappers/purchase-order-item.mapper";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";

@Injectable()
export class PurchaseOrderItemTypeormRepository implements PurchaseOrderItemRepository {
  constructor(
    @InjectRepository(PurchaseOrderItemEntity)
    private readonly repo: Repository<PurchaseOrderItemEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(PurchaseOrderItemEntity);
  }

  async add(item: PurchaseOrderItem, tx?: TransactionContext): Promise<PurchaseOrderItem> {
    const repo = this.getRepo(tx);
    const row = repo.create(PurchaseOrderItemMapper.toPersistence(item));
    const saved = await repo.save(row);
    const currency = item.unitPrice.getCurrency() as CurrencyType;
    return PurchaseOrderItemMapper.toDomain(saved, currency);
  }

  async remove(poItemId: string, tx?: TransactionContext): Promise<boolean> {
    const result = await this.getRepo(tx).delete({ id: poItemId });
    return (result.affected ?? 0) > 0;
  }

  async removeByPurchaseId(poId: string, tx?: TransactionContext): Promise<number> {
    const result = await this.getRepo(tx).delete({ poId });
    return result.affected ?? 0;
  }

  async getByPurchaseId(
    poId: string,
    currency: CurrencyType,
    tx?: TransactionContext,
  ): Promise<PurchaseOrderItem[]> {
    const rows = await this.getRepo(tx).find({ where: { poId } });
    return rows.map((r) => PurchaseOrderItemMapper.toDomain(r, currency));
  }

  async getSummariesByPurchaseIds(
    poIds: string[],
    maxItems = 2,
    tx?: TransactionContext,
  ): Promise<Map<string, PurchaseOrderItemSummary>> {
    const uniquePoIds = Array.from(new Set(poIds.map((id) => id?.trim()).filter(Boolean)));
    if (!uniquePoIds.length) return new Map();
    const safeMaxItems = Math.max(1, Math.min(10, Math.trunc(maxItems)));

    const rows = await this.getManager(tx).query(
      `
        SELECT ranked.*
        FROM (
          SELECT
            poi.po_id AS "poId",
            s.sku_id AS "skuId",
            COALESCE(NULLIF(TRIM(s.name), ''), NULLIF(TRIM(poi.service_name), ''), NULLIF(TRIM(poi.description), ''), 'Articulo') AS name,
            s.backend_sku AS "backendSku",
            s.custom_sku AS "customSku",
            selected_attribute.name AS "attributeName",
            selected_attribute.value AS "attributeValue",
            COUNT(*) OVER (PARTITION BY poi.po_id)::int AS total,
            ROW_NUMBER() OVER (PARTITION BY poi.po_id ORDER BY poi.po_item_id)::int AS "itemRank"
          FROM purchase_order_items poi
          LEFT JOIN pc_stock_items si ON si.stock_item_id = poi.stock_item_id
          LEFT JOIN pc_skus s ON s.sku_id = si.sku_id
          LEFT JOIN LATERAL (
            SELECT COALESCE(NULLIF(TRIM(a.name), ''), a.code) AS name, sav.value
            FROM pc_sku_attribute_values sav
            INNER JOIN pc_attributes a ON a.attribute_id = sav.attribute_id
            WHERE sav.sku_id = s.sku_id
              AND NULLIF(TRIM(sav.value), '') IS NOT NULL
            ORDER BY
              CASE
                WHEN LOWER(a.code) IN ('presentation', 'presentacion') OR LOWER(COALESCE(a.name, '')) LIKE 'presentaci%' THEN 1
                WHEN LOWER(a.code) IN ('variant', 'variante') OR LOWER(COALESCE(a.name, '')) = 'variante' THEN 2
                WHEN LOWER(a.code) IN ('color') OR LOWER(COALESCE(a.name, '')) = 'color' THEN 3
                ELSE 4
              END,
              a.code ASC
            LIMIT 1
          ) selected_attribute ON TRUE
          WHERE poi.po_id = ANY($1::uuid[])
        ) ranked
        WHERE ranked."itemRank" <= $2
        ORDER BY ranked."poId", ranked."itemRank"
      `,
      [uniquePoIds, safeMaxItems],
    ) as Array<{
      poId: string;
      skuId: string | null;
      name: string;
      backendSku: string | null;
      customSku: string | null;
      attributeName: string | null;
      attributeValue: string | null;
      total: number | string;
    }>;

    const summaries = new Map<string, PurchaseOrderItemSummary>();
    uniquePoIds.forEach((poId) => summaries.set(poId, { total: 0, items: [] }));
    rows.forEach((row) => {
      const summary = summaries.get(row.poId) ?? { total: Number(row.total ?? 0), items: [] };
      summary.total = Number(row.total ?? 0);
      summary.items.push({
        skuId: row.skuId ?? undefined,
        name: row.name,
        backendSku: row.backendSku ?? undefined,
        customSku: row.customSku ?? undefined,
        attributeName: row.attributeName ?? undefined,
        attributeValue: row.attributeValue ?? undefined,
      });
      summaries.set(row.poId, summary);
    });

    return summaries;
  }
}
