import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("production_order_items")
export class ProductionOrderItemEntity {
  @PrimaryGeneratedColumn("uuid", { name: "item_id" })
  id: string;

  @Column({ name: "production_id", type: "uuid" })
  productionId: string;

  @Column({ name: "finished_variant_id", type: "uuid" })
  finishedVariantId: string;

  @Column({ name: "from_location_id", type: "uuid" })
  fromLocationId: string;

  @Column({ name: "to_location_id", type: "uuid" })
  toLocationId: string;

  @Column({ name: "quantity", type: "int" })
  quantity: number;

  @Column({ name: "unit_cost", type: "numeric" })
  unitCost: number;
}
