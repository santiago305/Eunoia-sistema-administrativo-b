import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { ProductCatalogInventoryBalance } from "src/modules/product-catalog/domain/entities/inventory-balance";
import { ProductCatalogInventoryRepository } from "src/modules/product-catalog/domain/ports/inventory.repository";
import { ProductCatalogInventoryEntity } from "../entities/inventory.entity";
import { ProductCatalogStockItemEntity } from "../entities/stock-item.entity";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";

@Injectable()
export class ProductCatalogInventoryTypeormRepository implements ProductCatalogInventoryRepository {
  constructor(
    @InjectRepository(ProductCatalogInventoryEntity)
    private readonly repo: Repository<ProductCatalogInventoryEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductCatalogInventoryEntity);
  }

  private toDomain(row: ProductCatalogInventoryEntity): ProductCatalogInventoryBalance {
    return new ProductCatalogInventoryBalance(
      row.warehouseId,
      row.stockItemId,
      row.locationId ?? null,
      row.onHand,
      row.reserved,
      row.available ?? row.onHand - row.reserved,
      row.updatedAt,
    );
  }

  async getSnapshot(input: {
    warehouseId: string;
    stockItemId: string;
    locationId?: string | null;
  }, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance | null> {
    const row = await this.getRepo(tx).findOne({
      where: {
        warehouseId: input.warehouseId,
        stockItemId: input.stockItemId,
      },
    });
    if (!row) return null;
    if ((row.locationId ?? null) !== (input.locationId ?? null) && input.locationId !== undefined) {
      return null;
    }
    return this.toDomain(row);
  }

  async listByStockItemId(stockItemId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance[]> {
    const rows = await this.getRepo(tx).find({
      where: { stockItemId },
      order: { updatedAt: "DESC" },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async listBySkuId(skuId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance[]> {
    const rows = await this.getRepo(tx)
      .createQueryBuilder("i")
      .innerJoin(ProductCatalogStockItemEntity, "si", "si.stock_item_id = i.stock_item_id")
      .where("si.sku_id = :skuId", { skuId })
      .select([
        "i.warehouse_id AS warehouse_id",
        "i.stock_item_id AS stock_item_id",
        "i.location_id AS location_id",
        "i.on_hand AS on_hand",
        "i.reserved AS reserved",
        "i.available AS available",
        "i.updated_at AS updated_at",
      ])
      .orderBy("i.updated_at", "DESC")
      .getRawMany<{
        warehouse_id: string;
        stock_item_id: string;
        location_id: string | null;
        on_hand: number;
        reserved: number;
        available: number | null;
        updated_at: Date;
      }>();

    return rows.map(
      (row) =>
        new ProductCatalogInventoryBalance(
          row.warehouse_id,
          row.stock_item_id,
          row.location_id,
          Number(row.on_hand),
          Number(row.reserved),
          row.available !== null ? Number(row.available) : Number(row.on_hand) - Number(row.reserved),
          row.updated_at,
        ),
    );
  }

  async upsert(input: ProductCatalogInventoryBalance, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance> {
    await this.getRepo(tx).save({
      warehouseId: input.warehouseId,
      stockItemId: input.stockItemId,
      locationId: input.locationId,
      onHand: input.onHand,
      reserved: input.reserved,
      available: input.available,
    });

    const saved = await this.getRepo(tx).findOneOrFail({
      where: {
        warehouseId: input.warehouseId,
        stockItemId: input.stockItemId,
      },
    });
    return this.toDomain(saved);
  }

  async incrementReserved(input: {
    warehouseId: string;
    stockItemId: string;
    locationId?: string | null;
    delta: number;
  }, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance> {
    const current =
      (await this.getSnapshot({
        warehouseId: input.warehouseId,
        stockItemId: input.stockItemId,
        locationId: input.locationId ?? null,
      }, tx)) ??
      new ProductCatalogInventoryBalance(
        input.warehouseId,
        input.stockItemId,
        input.locationId ?? null,
        0,
        0,
        0,
      );

    const reserved = current.reserved + input.delta;
    const onHand = current.onHand;
    return this.upsert(
      new ProductCatalogInventoryBalance(
        input.warehouseId,
        input.stockItemId,
        input.locationId ?? null,
        onHand,
        reserved,
        onHand - reserved,
      ),
      tx,
    );
  }

  async incrementOnHand(input: {
    warehouseId: string;
    stockItemId: string;
    locationId?: string | null;
    delta: number;
  }, tx?: TransactionContext): Promise<ProductCatalogInventoryBalance> {
    const current =
      (await this.getSnapshot({
        warehouseId: input.warehouseId,
        stockItemId: input.stockItemId,
        locationId: input.locationId ?? null,
      }, tx)) ??
      new ProductCatalogInventoryBalance(
        input.warehouseId,
        input.stockItemId,
        input.locationId ?? null,
        0,
        0,
        0,
      );

    const onHand = current.onHand + input.delta;
    return this.upsert(
      new ProductCatalogInventoryBalance(
        input.warehouseId,
        input.stockItemId,
        input.locationId ?? null,
        onHand,
        current.reserved,
        onHand - current.reserved,
      ),
      tx,
    );
  }
}
