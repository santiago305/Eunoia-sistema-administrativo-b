import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SaleOrderItemComponentEntity } from "../entities/sale-order-item-component.entity";
import { SaleOrderItemEntity } from "../entities/sale-order-item.entity";
import { SaleOrderItemComponentRepository } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SaleOrderItemComponent } from "src/modules/sale-orders/domain/entities/sale-order-item-component";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogSkuAttributeValueEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku-attribute-value.entity";
import { ProductCatalogStockItemEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/stock-item.entity";
import { SaleOrderComponentsOutput } from "src/modules/sale-orders/application/dtos/sale-order-search/output/sale-order-search-state.output";

@Injectable()
export class SaleOrderItemComponentTypeormRepository implements SaleOrderItemComponentRepository {
  constructor(
    @InjectRepository(SaleOrderItemComponentEntity)
    private readonly repo: Repository<SaleOrderItemComponentEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }

    return this.repo.manager;
  }

  private toDomain(row: SaleOrderItemComponentEntity): SaleOrderItemComponent {
    return new SaleOrderItemComponent(
      row.id,
      row.saleOrderItemId,
      row.skuId,
      row.referencePackItemId ?? null,
      Number(row.quantity ?? 0),
      Number(row.unitPrice ?? 0),
      Number(row.total ?? 0),
      row.createdAt,
    );
  }

  private async getSkusWithAttributes(
    manager: EntityManager,
    skuIds: string[],
  ): Promise<{
    skuById: Map<string, ProductCatalogSkuEntity>;
    stockItemBySkuId: Map<string, ProductCatalogStockItemEntity>;
    attributesBySkuId: Map<
      string,
      Array<{
        code: string;
        name: string;
        value: string;
      }>
    >;
  }> {
    const skus = skuIds.length
      ? await manager.getRepository(ProductCatalogSkuEntity).find({
          where: { id: In(skuIds) },
          relations: { product: { baseUnit: true } },
        })
      : [];

    const stockItems = skuIds.length
      ? await manager.getRepository(ProductCatalogStockItemEntity).find({
          where: { skuId: In(skuIds) },
        })
      : [];

    const attributeValues = skuIds.length
      ? await manager.getRepository(ProductCatalogSkuAttributeValueEntity).find({
          where: { skuId: In(skuIds) },
          relations: {
            attribute: true,
          },
          order: {
            skuId: "ASC",
          },
        })
      : [];

    const skuById = new Map(skus.map((row) => [row.id, row]));
    const stockItemBySkuId = new Map(
      stockItems.map((row) => [row.skuId, row]),
    );

    const attributesBySkuId = new Map<
      string,
      Array<{
        code: string;
        name: string;
        value: string;
      }>
    >();

    for (const attrValue of attributeValues) {
      const current = attributesBySkuId.get(attrValue.skuId) ?? [];

      current.push({
        code: attrValue.attribute?.code ?? "",
        name: attrValue.attribute?.name ?? "",
        value: attrValue.value ?? "",
      });

      attributesBySkuId.set(attrValue.skuId, current);
    }

    return {
      skuById,
      stockItemBySkuId,
      attributesBySkuId,
    };
  }

  private mapComponentOutput(
    row: SaleOrderItemComponentEntity,
    skuById: Map<string, ProductCatalogSkuEntity>,
    stockItemBySkuId: Map<string, ProductCatalogStockItemEntity>,
    attributesBySkuId: Map<
      string,
      Array<{
        code: string;
        name: string;
        value: string;
      }>
    >,
  ) {
    const sku = skuById.get(row.skuId);

    if (!sku) {
      throw new BadRequestException("SKU no encontrado para componente");
    }
    const unit = sku.product?.baseUnit ?? null;

    return {
      id: row.id,
      saleOrderItemId: row.saleOrderItemId,
      sku: {
        id: sku.id,
        productId: sku.productId,
        name: sku.name,
        backendSku: sku.backendSku,
        customSku: sku.customSku ?? null,
        barcode: sku.barcode ?? null,
        image: sku.image ?? null,
        price: Number(sku.price ?? 0),
        cost: Number(sku.cost ?? 0),
        isSellable: Boolean(sku.isSellable),
        isPurchasable: Boolean(sku.isPurchasable),
        isManufacturable: Boolean(sku.isManufacturable),
        isStockTracked: Boolean(sku.isStockTracked),
        isActive: Boolean(sku.isActive),
        createdAt: sku.createdAt.toISOString(),
        updatedAt: sku.updatedAt ? sku.updatedAt.toISOString() : null,
      },
      unit: unit
        ? {
            id: unit.id,
            name: unit.name,
            code: unit.code,
          }
        : null,
      attributes: attributesBySkuId.get(sku.id) ?? [],
      stockItemId: stockItemBySkuId.get(sku.id)?.id ?? null,
      referencePackItemId: row.referencePackItemId ?? null,
      quantity: Number(row.quantity ?? 0),
      unitPrice: Number(row.unitPrice ?? 0),
      total: Number(row.total ?? 0),
      createdAt: row.createdAt.toISOString(),
    };
  }

  async bulkCreate(
    input: Parameters<SaleOrderItemComponentRepository["bulkCreate"]>[0],
    tx?: TransactionContext,
  ): Promise<SaleOrderItemComponent[]> {
    if (!input.length) return [];

    const manager = this.getManager(tx);

    const saved = await manager.getRepository(SaleOrderItemComponentEntity).save(
      input.map((row) => ({
        saleOrderItemId: row.saleOrderItemId,
        skuId: row.skuId,
        referencePackItemId: row.referencePackItemId ?? null,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        total: row.total,
      })),
    );

    return saved.map((row) => this.toDomain(row));
  }

  async listBySaleOrderItemIds(
    saleOrderItemIds: string[],
    tx?: TransactionContext,
  ): Promise<SaleOrderItemComponent[]> {
    if (!saleOrderItemIds.length) return [];

    const manager = this.getManager(tx);

    const rows = await manager.getRepository(SaleOrderItemComponentEntity).find({
      where: { saleOrderItemId: In(saleOrderItemIds) },
      order: { saleOrderItemId: "ASC", createdAt: "ASC" },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async deleteBySaleOrderItemIds(saleOrderItemIds: string[], tx?: TransactionContext): Promise<void> {
    if (!saleOrderItemIds.length) return;

    const manager = this.getManager(tx);

    await manager.getRepository(SaleOrderItemComponentEntity).delete({
      saleOrderItemId: In(saleOrderItemIds),
    });
  }

  async findComponentsBySaleOrderItemId(
    saleOrderItemId: string,
    tx?: TransactionContext,
  ): Promise<SaleOrderComponentsOutput> {
    const manager = this.getManager(tx);

    const components = await manager.getRepository(SaleOrderItemComponentEntity).find({
      where: { saleOrderItemId },
      order: { createdAt: "ASC" },
    });

    const skuIds = Array.from(new Set(components.map((row) => row.skuId).filter(Boolean)));

    const { skuById, stockItemBySkuId, attributesBySkuId } = await this.getSkusWithAttributes(manager, skuIds);

    const outputs = components.map((row) => this.mapComponentOutput(row, skuById, stockItemBySkuId, attributesBySkuId));

    return {
      saleOrderId: saleOrderItemId,
      items: [
        {
          saleOrderItemId,
          components: outputs,
        },
      ],
    };
  }

  async findComponentsBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrderComponentsOutput> {
    const manager = this.getManager(tx);

    const items = await manager.getRepository(SaleOrderItemEntity).find({
      where: { saleOrderId },
      order: { createdAt: "ASC" },
    });

    const itemIds = items.map((row) => row.id);

    if (!itemIds.length) {
      return { saleOrderId, items: [] };
    }

    const components = await manager.getRepository(SaleOrderItemComponentEntity).find({
      where: { saleOrderItemId: In(itemIds) },
      order: { saleOrderItemId: "ASC", createdAt: "ASC" },
    });

    const skuIds = Array.from(new Set(components.map((row) => row.skuId).filter(Boolean)));

    const { skuById, stockItemBySkuId, attributesBySkuId } = await this.getSkusWithAttributes(manager, skuIds);

    const outputs = components.map((row) => this.mapComponentOutput(row, skuById, stockItemBySkuId, attributesBySkuId));

    const byItemId = new Map<string, typeof outputs>();

    for (const component of outputs) {
      const list = byItemId.get(component.saleOrderItemId) ?? [];
      list.push(component);
      byItemId.set(component.saleOrderItemId, list);
    }

    return {
      saleOrderId,
      items: itemIds.map((saleOrderItemId) => ({
        saleOrderItemId,
        components: byItemId.get(saleOrderItemId) ?? [],
      })),
    };
  }
}
