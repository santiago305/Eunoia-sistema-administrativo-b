import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductCatalogProductType } from 'src/modules/product-catalog/domain/value-objects/product-type';
import { ProductCatalogSkuEntity } from 'src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity';
import { ProductCatalogUnitEntity } from 'src/modules/product-catalog/adapters/out/persistence/typeorm/entities/unit.entity';
import { WorkflowEntity } from '../../adapters/out/persistence/typeorm/entities/workflow.entity';
import { WorkflowSupplyRecipeEntity } from '../../adapters/out/persistence/typeorm/entities/workflow-supply-recipe.entity';
import { WorkflowSupplyRecipeItemEntity } from '../../adapters/out/persistence/typeorm/entities/workflow-supply-recipe-item.entity';

type SaveWorkflowSupplyRecipeInput = {
  notes?: string | null;
  items: Array<{ supplySkuId: string; quantity: number; unitId: string }>;
};

export const normalizeWorkflowSupplyQuantity = (quantity: number) => {
  const normalized = Math.round((quantity + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(quantity) || quantity < 0.01 || Math.abs(quantity - normalized) >= 1e-9) {
    throw new BadRequestException('La cantidad debe ser mayor o igual a 0.01 y tener máximo 2 decimales');
  }
  return normalized;
};

@Injectable()
export class WorkflowSupplyRecipeService {
  constructor(
    @InjectRepository(WorkflowSupplyRecipeEntity)
    private readonly recipeRepo: Repository<WorkflowSupplyRecipeEntity>,
    @InjectRepository(WorkflowSupplyRecipeItemEntity)
    private readonly itemRepo: Repository<WorkflowSupplyRecipeItemEntity>,
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepo: Repository<WorkflowEntity>,
    @InjectRepository(ProductCatalogSkuEntity)
    private readonly skuRepo: Repository<ProductCatalogSkuEntity>,
    @InjectRepository(ProductCatalogUnitEntity)
    private readonly unitRepo: Repository<ProductCatalogUnitEntity>,
  ) {}

  async getByWorkflowId(workflowId: string) {
    const recipe = await this.recipeRepo.findOne({ where: { workflowId } });
    if (!recipe) return null;

    const items = await this.itemRepo.find({
      where: { recipeId: recipe.id },
      relations: { supplySku: { product: true }, unit: true },
      order: { id: 'ASC' },
    });

    return this.toResponse(recipe, items);
  }

  async save(workflowId: string, input: SaveWorkflowSupplyRecipeInput) {
    const normalizedItems = input.items.map((item) => ({
      ...item,
      quantity: normalizeWorkflowSupplyQuantity(item.quantity),
    }));
    const workflow = await this.workflowRepo.findOne({ where: { id: workflowId } });
    if (!workflow) throw new NotFoundException('Flujo no encontrado');

    const uniqueSkuIds = new Set(normalizedItems.map((item) => item.supplySkuId));
    if (uniqueSkuIds.size !== normalizedItems.length) {
      throw new BadRequestException('Un insumo no puede repetirse dentro de la receta');
    }

    const skuIds = [...uniqueSkuIds];
    const unitIds = [...new Set(normalizedItems.map((item) => item.unitId))];
    const [supplySkus, units] = await Promise.all([
      this.skuRepo.find({ where: { id: In(skuIds) }, relations: { product: true } }),
      this.unitRepo.findBy({ id: In(unitIds) }),
    ]);

    const validSupplySkuIds = new Set(
      supplySkus
        .filter(
          (sku) =>
            sku.product?.type === ProductCatalogProductType.SUPPLY &&
            sku.isActive &&
            !sku.isDeleted &&
            sku.product.isActive &&
            !sku.product.isDeleted,
        )
        .map((sku) => sku.id),
    );
    if (validSupplySkuIds.size !== skuIds.length) {
      throw new BadRequestException('La receta solo puede contener SKUs de insumos activos');
    }
    if (units.length !== unitIds.length) {
      throw new BadRequestException('Una o más unidades no existen');
    }

    const recipeId = await this.recipeRepo.manager.transaction(async (manager) => {
      const recipes = manager.getRepository(WorkflowSupplyRecipeEntity);
      const items = manager.getRepository(WorkflowSupplyRecipeItemEntity);
      const current = await recipes.findOne({ where: { workflowId } });
      const saved = await recipes.save(
        current
          ? { ...current, notes: input.notes?.trim() || null, version: current.version + 1 }
          : { workflowId, notes: input.notes?.trim() || null, version: 1 },
      );

      await items.delete({ recipeId: saved.id });
      await items.save(
        normalizedItems.map((item) => ({
          recipeId: saved.id,
          supplySkuId: item.supplySkuId,
          quantity: item.quantity,
          unitId: item.unitId,
        })),
      );
      return saved.id;
    });

    const savedRecipe = await this.recipeRepo.findOneOrFail({ where: { id: recipeId } });
    const savedItems = await this.itemRepo.find({
      where: { recipeId },
      relations: { supplySku: { product: true }, unit: true },
      order: { id: 'ASC' },
    });
    return this.toResponse(savedRecipe, savedItems);
  }

  private toResponse(recipe: WorkflowSupplyRecipeEntity, items: WorkflowSupplyRecipeItemEntity[]) {
    return {
      id: recipe.id,
      workflowId: recipe.workflowId,
      version: recipe.version,
      notes: recipe.notes,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      items: items.map((item) => ({
        id: item.id,
        supplySkuId: item.supplySkuId,
        quantity: Number(item.quantity),
        unitId: item.unitId,
        supplyName: item.supplySku?.product?.name ?? item.supplySku?.name ?? '',
        skuName: item.supplySku?.name ?? '',
        backendSku: item.supplySku?.backendSku ?? '',
        unitName: item.unit?.name ?? '',
        unitCode: item.unit?.code ?? '',
      })),
    };
  }
}
