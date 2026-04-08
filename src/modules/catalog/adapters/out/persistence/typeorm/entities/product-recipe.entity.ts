import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';

@Entity('product_recipes')
export class ProductRecipeEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'recipe_id' })
  id: string;

  @Column({ name: 'finished_type', type: 'enum', enum: StockItemType, enumName: 'stock_item_type' })
  finishedType: StockItemType;

  @Column({ name: 'finished_variant_id', type: 'uuid' })
  finishedItemId: string;

  @Column({ name: 'prima_variant_id', type: 'uuid' })
  primaVariantId: string;

  @Column({ type: 'numeric', precision: 12, scale: 6 })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 6, nullable: true })
  waste?: number | null;
}
