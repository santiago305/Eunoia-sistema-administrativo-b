import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ProductionOrderEntity } from "./production_order.entity";
import { WarehouseLocationEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse-location";

@Entity("production_order_items")
export class ProductionOrderItemEntity {
  @PrimaryGeneratedColumn("uuid", { name: "item_id" })
  id: string;

  @Column({ name: "production_id", type: "uuid" })
  productionId: string;

  @ManyToOne(() => ProductionOrderEntity, (order) => order.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "production_id" })
  production?: ProductionOrderEntity;

  @Column({ name: "finished_item_id", type: "uuid" })
  finishedItemId: string;

  @Column({ name: "from_location_id", type: "uuid", nullable: true })
  fromLocationId: string | null;

  @ManyToOne(() => WarehouseLocationEntity, { nullable: true })
  @JoinColumn({ name: "from_location_id" })
  fromLocation?: WarehouseLocationEntity;

  @Column({ name: "to_location_id", type: "uuid", nullable: true })
  toLocationId: string | null;

  @ManyToOne(() => WarehouseLocationEntity, { nullable: true })
  @JoinColumn({ name: "to_location_id" })
  toLocation?: WarehouseLocationEntity;

  @Column({ name: "quantity", type: "int" })
  quantity: number;

  @Column({ name: "unit_cost", type: "numeric" })
  unitCost: number;
}
