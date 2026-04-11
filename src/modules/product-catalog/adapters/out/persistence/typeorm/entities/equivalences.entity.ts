import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { ProductCatalogProductEntity } from "./product.entity";
import { ProductCatalogUnitEntity } from "./unit.entity";

@Entity("pc_equivalences")
export class ProductCatalogEquivalencesEntity {
  @PrimaryGeneratedColumn("uuid", { name: "equivalence_id" })
  id: string;

  @Column({ name: "product_id", type: "uuid" })
  productId: string;

  @ManyToOne(() => ProductCatalogProductEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product?: ProductCatalogProductEntity;

  @Column({ name: "from_unit_id", type: "uuid" })
  fromUnitId: string;

  @ManyToOne(() => ProductCatalogUnitEntity)
  @JoinColumn({ name: "from_unit_id" })
  fromUnit?: ProductCatalogUnitEntity;

  @Column({ name: "to_unit_id", type: "uuid" })
  toUnitId: string;

  @ManyToOne(() => ProductCatalogUnitEntity)
  @JoinColumn({ name: "to_unit_id" })
  toUnit?: ProductCatalogUnitEntity;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  factor: number;
}
