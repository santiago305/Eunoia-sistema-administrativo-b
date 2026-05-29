import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SaleOrderItemComponentEntity } from "../entities/sale-order-item-component.entity";
import { SaleOrderItemComponentRepository } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SaleOrderItemComponent } from "src/modules/sale-orders/domain/entities/sale-order-item-component";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { SaleOrderItemEntity } from "../entities/sale-order-item.entity";
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

  async listBySaleOrderItemIds(saleOrderItemIds: string[], tx?: TransactionContext): Promise<SaleOrderItemComponent[]> {
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
    await manager.getRepository(SaleOrderItemComponentEntity).delete({ saleOrderItemId: In(saleOrderItemIds) });
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

    const skus = skuIds.length ? await manager.getRepository(ProductCatalogSkuEntity).find({ where: { id: In(skuIds) } }) : [];

    const skuById = new Map(skus.map((row) => [row.id, row]));

    const outputs = components.map((row) => {
      const sku = skuById.get(row.skuId);

      if (!sku) {
        throw new BadRequestException("SKU no encontrado para componente");
      }

      return {
        id: row.id,
        saleOrderItemId: row.saleOrderItemId,
        sku: {
          id: sku.id,
          name: sku.name,
          backendSku: sku.backendSku,
          customSku: sku.customSku,
          barcode: sku.barcode,
        },
        referencePackItemId: row.referencePackItemId ?? null,
        quantity: Number(row.quantity ?? 0),
        unitPrice: Number(row.unitPrice ?? 0),
        total: Number(row.total ?? 0),
        createdAt: row.createdAt.toISOString(),
      };
    });

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
