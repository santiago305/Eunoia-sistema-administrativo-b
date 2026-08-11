import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductCatalogSkuEntity } from 'src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity';
import { ProductCatalogUnitEntity } from 'src/modules/product-catalog/adapters/out/persistence/typeorm/entities/unit.entity';
import { WorkflowSupplyRecipeItemEntity } from 'src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow-supply-recipe-item.entity';
import { SaleOrderEntity } from './sale-order.entity';

@Entity('sale_order_supply_items')
@Index('ux_sale_order_supply_item_sku', ['saleOrderId', 'supplySkuId'], { unique: true })
@Index('idx_sale_order_supply_items_order', ['saleOrderId'])
@Index('idx_sale_order_supply_items_sku', ['supplySkuId'])
export class SaleOrderSupplyItemEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'sale_order_supply_item_id' })
  id: string;

  @Column({ name: 'sale_order_id', type: 'uuid' })
  saleOrderId: string;

  @ManyToOne(() => SaleOrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_order_id' })
  saleOrder?: SaleOrderEntity;

  @Column({ name: 'supply_sku_id', type: 'uuid' })
  supplySkuId: string;

  @ManyToOne(() => ProductCatalogSkuEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supply_sku_id' })
  supplySku?: ProductCatalogSkuEntity;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId: string;

  @ManyToOne(() => ProductCatalogUnitEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit?: ProductCatalogUnitEntity;

  @Column({ name: 'reference_recipe_item_id', type: 'uuid', nullable: true })
  referenceRecipeItemId?: string | null;

  @ManyToOne(() => WorkflowSupplyRecipeItemEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reference_recipe_item_id' })
  referenceRecipeItem?: WorkflowSupplyRecipeItemEntity | null;

  @Column({ name: 'supply_name_snapshot', type: 'varchar', length: 180 })
  supplyNameSnapshot: string;

  @Column({ name: 'sku_name_snapshot', type: 'varchar', length: 180 })
  skuNameSnapshot: string;

  @Column({ name: 'backend_sku_snapshot', type: 'varchar', length: 80 })
  backendSkuSnapshot: string;

  @Column({ name: 'custom_sku_snapshot', type: 'varchar', length: 80, nullable: true })
  customSkuSnapshot?: string | null;

  @Column({ name: 'unit_name_snapshot', type: 'varchar', length: 180 })
  unitNameSnapshot: string;

  @Column({ name: 'unit_code_snapshot', type: 'varchar', length: 50 })
  unitCodeSnapshot: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
