import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { ProductCatalogProductType } from 'src/modules/product-catalog/domain/value-objects/product-type';
import { ProductCatalogSkuEntity } from 'src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity';
import { ProductCatalogUnitEntity } from 'src/modules/product-catalog/adapters/out/persistence/typeorm/entities/unit.entity';
import { WorkflowSupplyRecipeEntity } from 'src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow-supply-recipe.entity';
import { WorkflowSupplyRecipeItemEntity } from 'src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow-supply-recipe-item.entity';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { SaleOrderSupplyItem } from 'src/modules/sale-orders/domain/entities/sale-order-supply-item';
import { SaleOrderSupplyItemRepository } from 'src/modules/sale-orders/domain/ports/sale-order-supply-item.repository';
import { SaleOrderEntity } from '../entities/sale-order.entity';
import { SaleOrderSupplyItemEntity } from '../entities/sale-order-supply-item.entity';

@Injectable()
export class SaleOrderSupplyItemTypeormRepository implements SaleOrderSupplyItemRepository {
  constructor(
    @InjectRepository(SaleOrderSupplyItemEntity)
    private readonly repo: Repository<SaleOrderSupplyItemEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    return (tx as TypeormTransactionContext | undefined)?.manager ?? this.repo.manager;
  }

  private toDomain(row: SaleOrderSupplyItemEntity): SaleOrderSupplyItem {
    return new SaleOrderSupplyItem(
      row.id,
      row.saleOrderId,
      row.supplySkuId,
      Number(row.quantity),
      row.unitId,
      row.referenceRecipeItemId ?? null,
      row.supplyNameSnapshot,
      row.skuNameSnapshot,
      row.backendSkuSnapshot,
      row.customSkuSnapshot ?? null,
      row.unitNameSnapshot,
      row.unitCodeSnapshot,
      row.createdAt,
      row.updatedAt,
    );
  }

  async saleOrderExists(saleOrderId: string, tx?: TransactionContext): Promise<boolean> {
    return this.getManager(tx).getRepository(SaleOrderEntity).existsBy({ id: saleOrderId });
  }

  async listBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrderSupplyItem[]> {
    const rows = await this.getManager(tx).getRepository(SaleOrderSupplyItemEntity).find({
      where: { saleOrderId },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findCatalogItems(supplySkuIds: string[], unitIds: string[], tx?: TransactionContext) {
    const manager = this.getManager(tx);
    const [skus, units] = await Promise.all([
      supplySkuIds.length
        ? manager.getRepository(ProductCatalogSkuEntity).find({
            where: { id: In(supplySkuIds) },
            relations: { product: true },
          })
        : [],
      unitIds.length
        ? manager.getRepository(ProductCatalogUnitEntity).findBy({ id: In(unitIds) })
        : [],
    ]);
    return {
      supplies: skus.map((sku) => ({
        supplySkuId: sku.id,
        isActiveSupply: sku.product?.type === ProductCatalogProductType.SUPPLY
          && sku.isActive && !sku.isDeleted && Boolean(sku.product.isActive) && !sku.product.isDeleted,
        supplyName: sku.product?.name ?? sku.name,
        skuName: sku.name,
        backendSku: sku.backendSku,
        customSku: sku.customSku ?? null,
      })),
      units: units.map((unit) => ({ unitId: unit.id, unitName: unit.name, unitCode: unit.code })),
    };
  }

  async findRecipeItemsByWorkflowId(workflowId: string, tx?: TransactionContext) {
    const manager = this.getManager(tx);
    const recipe = await manager.getRepository(WorkflowSupplyRecipeEntity).findOne({ where: { workflowId } });
    if (!recipe) return [];
    return this.mapRecipeItems(await manager.getRepository(WorkflowSupplyRecipeItemEntity).find({
      where: { recipeId: recipe.id },
      order: { id: 'ASC' },
    }));
  }

  async findRecipeItemsByIds(recipeItemIds: string[], tx?: TransactionContext) {
    if (!recipeItemIds.length) return [];
    const rows = await this.getManager(tx).getRepository(WorkflowSupplyRecipeItemEntity).findBy({
      id: In(recipeItemIds),
    });
    return this.mapRecipeItems(rows);
  }

  private mapRecipeItems(rows: WorkflowSupplyRecipeItemEntity[]) {
    return rows.map((row) => ({
      recipeItemId: row.id,
      supplySkuId: row.supplySkuId,
      quantity: Number(row.quantity),
      unitId: row.unitId,
    }));
  }

  async replace(saleOrderId: string, input: Parameters<SaleOrderSupplyItemRepository['replace']>[1], tx?: TransactionContext) {
    const repository = this.getManager(tx).getRepository(SaleOrderSupplyItemEntity);
    await repository.delete({ saleOrderId });
    if (!input.length) return [];
    const saved = await repository.save(input.map((item) => ({ saleOrderId, ...item })));
    return saved.map((row) => this.toDomain(row));
  }
}
