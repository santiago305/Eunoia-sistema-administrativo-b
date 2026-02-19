import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";

@Entity("production_orders")
export class ProductionOrderEntity {
  @PrimaryGeneratedColumn("uuid", { name: "production_id" })
  id: string;

  @Column({ name: "from_warehouse_id", type: "uuid" })
  fromWarehouseId: string;

  @Column({ name: "to_warehouse_id", type: "uuid" })
  toWarehouseId: string;

  @Column({ name: "serie_id", type: "uuid" })
  serieId: string;

  @Column({ name: "correlative", type: "int" })
  correlative: number;

  @Column({ name: "status", type: "enum", enum: ProductionStatus, enumName: "production_status", default: ProductionStatus.DRAFT })
  status: ProductionStatus;

  @Column({ name: "reference", type: "varchar" })
  reference: string;

  @Column({ name: "manufacture_time", type: "int" })
  manufactureTime: number;

  @Column({ name: "created_by", type: "varchar" })
  createdBy: string;

  @Column({ name: "updated_by", type: "varchar", nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
