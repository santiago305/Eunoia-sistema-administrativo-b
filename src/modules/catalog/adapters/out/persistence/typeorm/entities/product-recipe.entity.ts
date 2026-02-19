import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('product_recipes')
export class ProductRecipeEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'recipe_id' })
  id: string;

  @Column({ name: 'finished_variant_id', type: 'uuid' })
  finishedVariantId: string;

  @Column({ name: 'prima_variant_id', type: 'uuid' })
  primaVariantId: string;

  @Column({ type: 'numeric', precision: 12, scale: 6 })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 6, nullable: true })
  waste?: number | null;
}
