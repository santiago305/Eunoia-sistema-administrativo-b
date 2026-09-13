import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ProductCatalogInventoryEntity } from 'src/modules/product-catalog/adapters/out/persistence/typeorm/entities/inventory.entity';
import {
  ExpectedInventoryReservation,
  SaleOrderReservationTotalsQuery,
} from 'src/modules/sale-orders/application/ports/sale-order-reservation-totals.query';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';

type ExpectedReservationRow = {
  stockItemId: string;
  skuCode: string;
  productName: string;
  expectedReserved: number | string;
};

@Injectable()
export class SaleOrderReservationTotalsTypeormQuery
  implements SaleOrderReservationTotalsQuery
{
  constructor(
    @InjectRepository(ProductCatalogInventoryEntity)
    private readonly inventoryRepo: Repository<ProductCatalogInventoryEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    return (
      (tx as TypeormTransactionContext | undefined)?.manager ??
      this.inventoryRepo.manager
    );
  }

  async listExpected(
    input: { warehouseId: string; stockItemIds: string[] },
    tx?: TransactionContext,
  ): Promise<ExpectedInventoryReservation[]> {
    const stockItemIds = Array.from(new Set(input.stockItemIds));
    if (!stockItemIds.length) return [];

    const rows = (await this.getManager(tx).query(
      `
        WITH requested_stock AS (
          SELECT
            stock_item.stock_item_id,
            COALESCE(NULLIF(TRIM(sku.custom_sku), ''), sku.backend_sku) AS sku_code,
            sku.name AS product_name
          FROM pc_stock_items stock_item
          INNER JOIN pc_skus sku ON sku.sku_id = stock_item.sku_id
          WHERE stock_item.stock_item_id = ANY($2::uuid[])
        ), expected_reservations AS (
          SELECT
            sale_order.warehouse_id,
            stock_item.stock_item_id,
            component.quantity::numeric AS quantity
          FROM sale_orders sale_order
          INNER JOIN sale_order_items sale_item
            ON sale_item.sale_order_id = sale_order.id
          INNER JOIN sale_order_item_components component
            ON component.sale_order_item_id = sale_item.id
          INNER JOIN pc_stock_items stock_item
            ON stock_item.sku_id = component.sku_id
          WHERE sale_order.reserve_bool = TRUE
            AND sale_order.is_active = TRUE
            AND sale_order.warehouse_id = $1
            AND stock_item.stock_item_id = ANY($2::uuid[])

          UNION ALL

          SELECT
            sale_order.warehouse_id,
            stock_item.stock_item_id,
            supply.quantity::numeric AS quantity
          FROM sale_orders sale_order
          INNER JOIN sale_order_supply_items supply
            ON supply.sale_order_id = sale_order.id
          INNER JOIN pc_stock_items stock_item
            ON stock_item.sku_id = supply.supply_sku_id
          WHERE sale_order.reserve_bool = TRUE
            AND sale_order.is_active = TRUE
            AND sale_order.warehouse_id = $1
            AND stock_item.stock_item_id = ANY($2::uuid[])

          UNION ALL

          SELECT
            production.from_warehouse_id AS warehouse_id,
            material_stock_item.stock_item_id,
            (recipe_item.quantity * production_item.quantity)::numeric AS quantity
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
          INNER JOIN pc_stock_items material_stock_item
            ON material_stock_item.sku_id = recipe_item.material_sku_id
          WHERE production.status::text IN ('IN_PROGRESS', 'PARTIAL')
            AND production.from_warehouse_id = $1
            AND material_stock_item.stock_item_id = ANY($2::uuid[])
        )
        SELECT
          requested.stock_item_id AS "stockItemId",
          requested.sku_code AS "skuCode",
          requested.product_name AS "productName",
          COALESCE(SUM(expected.quantity), 0)::numeric AS "expectedReserved"
        FROM requested_stock requested
        LEFT JOIN expected_reservations expected
          ON expected.stock_item_id = requested.stock_item_id
          AND expected.warehouse_id = $1
        GROUP BY
          requested.stock_item_id,
          requested.sku_code,
          requested.product_name
        ORDER BY requested.product_name, requested.sku_code
      `,
      [input.warehouseId, stockItemIds],
    )) as ExpectedReservationRow[];

    return rows.map((row) => ({
      stockItemId: row.stockItemId,
      skuCode: row.skuCode,
      productName: row.productName,
      expectedReserved: Number(row.expectedReserved ?? 0),
    }));
  }
}
