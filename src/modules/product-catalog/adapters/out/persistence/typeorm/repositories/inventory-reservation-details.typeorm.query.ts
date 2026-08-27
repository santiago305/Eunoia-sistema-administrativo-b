import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InventoryReservationDetail,
  InventoryReservationDetailsQuery,
  InventoryReservationDetailsResult,
} from 'src/modules/product-catalog/application/ports/inventory-reservation-details.query';
import { ProductCatalogProductType } from 'src/modules/product-catalog/domain/value-objects/product-type';
import { ProductCatalogInventoryEntity } from '../entities/inventory.entity';

type RawReservationRow = {
  sourceType: 'SALE_ORDER' | 'PRODUCTION_ORDER';
  sourceId: string;
  documentNumber: string | null;
  subjectName: string | null;
  statusCode: string | null;
  statusName: string | null;
  plannedDate: Date | string | null;
  createdAt: Date | string;
  quantity: number | string;
};

@Injectable()
export class InventoryReservationDetailsTypeormQuery
  implements InventoryReservationDetailsQuery
{
  constructor(
    @InjectRepository(ProductCatalogInventoryEntity)
    private readonly inventoryRepo: Repository<ProductCatalogInventoryEntity>,
  ) {}

  private normalizeDate(value: Date | string | null): string | null {
    if (value === null) return null;
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  private normalizeRows(
    rows: RawReservationRow[],
  ): InventoryReservationDetail[] {
    return rows.map((row) => ({
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      documentNumber: row.documentNumber?.trim() || row.sourceId.slice(0, 8),
      subjectName: row.subjectName?.trim() || null,
      statusCode: row.statusCode?.trim() || 'RESERVED',
      statusName: row.statusName?.trim() || 'Reservado',
      plannedDate: this.normalizeDate(row.plannedDate),
      createdAt: this.normalizeDate(row.createdAt) ?? '',
      quantity: Number(row.quantity ?? 0),
    }));
  }

  private async listSaleOrderReservations(params: {
    stockItemId: string;
    warehouseId: string;
    productType:
      | ProductCatalogProductType.PRODUCT
      | ProductCatalogProductType.SUPPLY;
  }): Promise<RawReservationRow[]> {
    const isSupply = params.productType === ProductCatalogProductType.SUPPLY;
    const itemJoin = isSupply
      ? `INNER JOIN sale_order_supply_items reservation_item
           ON reservation_item.sale_order_id = sale_order.id
         INNER JOIN pc_stock_items target_stock_item
           ON target_stock_item.sku_id = reservation_item.supply_sku_id`
      : `INNER JOIN sale_order_items sale_order_item
           ON sale_order_item.sale_order_id = sale_order.id
         INNER JOIN sale_order_item_components reservation_item
           ON reservation_item.sale_order_item_id = sale_order_item.id
         INNER JOIN pc_stock_items target_stock_item
           ON target_stock_item.sku_id = reservation_item.sku_id`;

    return this.inventoryRepo.manager.query(
      `
        SELECT
          'SALE_ORDER' AS "sourceType",
          sale_order.id AS "sourceId",
          COALESCE(
            NULLIF(CONCAT_WS('-', NULLIF(TRIM(sale_order.serie), ''), sale_order.correlative::text), ''),
            LEFT(sale_order.id::text, 8)
          ) AS "documentNumber",
          client.full_name AS "subjectName",
          COALESCE(order_state.code, 'RESERVED') AS "statusCode",
          COALESCE(order_state.name, 'Reservado') AS "statusName",
          COALESCE(sale_order.schedule_date, sale_order.delivery_date)::text AS "plannedDate",
          sale_order.created_at AS "createdAt",
          SUM(reservation_item.quantity)::numeric AS quantity
        FROM sale_orders sale_order
        ${itemJoin}
        LEFT JOIN clients client ON client.id = sale_order.client_id
        LEFT JOIN workflow_states workflow_state ON workflow_state.id = sale_order.current_state_id
        LEFT JOIN sale_order_states order_state ON order_state.id = workflow_state.sale_order_state_id
        WHERE sale_order.reserve_bool = TRUE
          AND sale_order.is_active = TRUE
          AND sale_order.warehouse_id = $1
          AND target_stock_item.stock_item_id = $2
        GROUP BY
          sale_order.id,
          client.full_name,
          order_state.code,
          order_state.name
        ORDER BY sale_order.created_at DESC
      `,
      [params.warehouseId, params.stockItemId],
    );
  }

  private async listProductionReservations(params: {
    stockItemId: string;
    warehouseId: string;
  }): Promise<RawReservationRow[]> {
    return this.inventoryRepo.manager.query(
      `
        SELECT
          'PRODUCTION_ORDER' AS "sourceType",
          production.production_id AS "sourceId",
          COALESCE(
            NULLIF(CONCAT_WS(
              COALESCE(document_serie.separator, '-'),
              NULLIF(TRIM(document_serie.code), ''),
              production.correlative::text
            ), ''),
            LEFT(production.production_id::text, 8)
          ) AS "documentNumber",
          NULLIF(TRIM(production.reference), '') AS "subjectName",
          production.status::text AS "statusCode",
          CASE production.status::text
            WHEN 'IN_PROGRESS' THEN 'En progreso'
            WHEN 'PARTIAL' THEN 'Parcial'
            ELSE production.status::text
          END AS "statusName",
          production.manufacture_date AS "plannedDate",
          production.created_at AS "createdAt",
          SUM(recipe_item.quantity * production_item.quantity)::numeric AS quantity
        FROM production_orders production
        INNER JOIN production_order_items production_item
          ON production_item.production_id = production.production_id
        INNER JOIN pc_stock_items finished_stock_item
          ON finished_stock_item.stock_item_id = production_item.finished_item_id
        INNER JOIN pc_recipes recipe
          ON recipe.sku_id = finished_stock_item.sku_id
          AND recipe.is_active = TRUE
        INNER JOIN pc_recipe_items recipe_item
          ON recipe_item.recipe_id = recipe.recipe_id
        INNER JOIN pc_stock_items target_stock_item
          ON target_stock_item.sku_id = recipe_item.material_sku_id
        LEFT JOIN document_series document_serie
          ON document_serie.serie_id = production.serie_id
        WHERE production.status::text IN ('IN_PROGRESS', 'PARTIAL')
          AND production.from_warehouse_id = $1
          AND target_stock_item.stock_item_id = $2
        GROUP BY
          production.production_id,
          document_serie.code,
          document_serie.separator
        ORDER BY production.created_at DESC
      `,
      [params.warehouseId, params.stockItemId],
    );
  }

  async list(params: {
    stockItemId: string;
    warehouseId: string;
    productType: ProductCatalogProductType;
  }): Promise<InventoryReservationDetailsResult> {
    const [inventoryRow, rawRows] = await Promise.all([
      this.inventoryRepo
        .createQueryBuilder('inventory')
        .select('COALESCE(SUM(inventory.reserved), 0)', 'reserved')
        .where('inventory.warehouseId = :warehouseId', {
          warehouseId: params.warehouseId,
        })
        .andWhere('inventory.stockItemId = :stockItemId', {
          stockItemId: params.stockItemId,
        })
        .getRawOne<{ reserved: number | string }>(),
      params.productType === ProductCatalogProductType.MATERIAL
        ? this.listProductionReservations(params)
        : this.listSaleOrderReservations({
            ...params,
            productType: params.productType,
          }),
    ]);

    const items = this.normalizeRows(rawRows);
    const inventoryReserved = Number(inventoryRow?.reserved ?? 0);
    const attributedReserved = items.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    return {
      stockItemId: params.stockItemId,
      warehouseId: params.warehouseId,
      productType: params.productType,
      inventoryReserved,
      attributedReserved,
      difference: inventoryReserved - attributedReserved,
      items,
    };
  }
}
