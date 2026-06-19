import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ProductCatalogStockItemEntity } from "./stock-item.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";

@Entity("pc_inventory_alert_settings")
@Index("ux_pc_inventory_alert_settings_global", ["stockItemId"], { unique: true, where: "\"warehouse_id\" IS NULL" })
@Index("ux_pc_inventory_alert_settings_warehouse", ["stockItemId", "warehouseId"], { unique: true, where: "\"warehouse_id\" IS NOT NULL" })
export class ProductCatalogInventoryAlertSettingEntity {
  @PrimaryGeneratedColumn("uuid", { name: "setting_id" })
  id: string;

  @Column({ name: "stock_item_id", type: "uuid" })
  stockItemId: string;

  @ManyToOne(() => ProductCatalogStockItemEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "stock_item_id" })
  stockItem?: ProductCatalogStockItemEntity;

  @Column({ name: "warehouse_id", type: "uuid", nullable: true })
  warehouseId: string | null;

  @ManyToOne(() => WarehouseEntity, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "warehouse_id" })
  warehouse?: WarehouseEntity | null;

  @Column({ name: "min_stock_alert_qty", type: "int", nullable: true })
  minStockAlertQty: number | null;

  @Column({ name: "alert_threshold_days", type: "double precision", default: 3 })
  alertThresholdDays: number;

  @Column({ name: "alert_enabled", type: "boolean", default: true })
  alertEnabled: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
