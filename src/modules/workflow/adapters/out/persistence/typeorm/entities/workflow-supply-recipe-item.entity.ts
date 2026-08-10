import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProductCatalogSkuEntity } from 'src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity';
import { ProductCatalogUnitEntity } from 'src/modules/product-catalog/adapters/out/persistence/typeorm/entities/unit.entity';
import { WorkflowSupplyRecipeEntity } from './workflow-supply-recipe.entity';

@Entity('workflow_supply_recipe_items')
@Index('ux_workflow_supply_recipe_item_sku', ['recipeId', 'supplySkuId'], { unique: true })
export class WorkflowSupplyRecipeItemEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'recipe_item_id' })
  id: string;

  @Column({ name: 'recipe_id', type: 'uuid' })
  recipeId: string;

  @ManyToOne(() => WorkflowSupplyRecipeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe?: WorkflowSupplyRecipeEntity;

  @Column({ name: 'supply_sku_id', type: 'uuid' })
  supplySkuId: string;

  @ManyToOne(() => ProductCatalogSkuEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supply_sku_id' })
  supplySku?: ProductCatalogSkuEntity;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  quantity: number;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId: string;

  @ManyToOne(() => ProductCatalogUnitEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit?: ProductCatalogUnitEntity;
}
