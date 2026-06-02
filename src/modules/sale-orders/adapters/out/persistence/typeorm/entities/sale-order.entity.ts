import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AgendaStatus } from "src/modules/sale-orders/domain/value-objects/agenda-status";
import { DeliveryStatus } from "src/modules/sale-orders/domain/value-objects/delivery-status";
import { DeliveryType } from "src/modules/sale-orders/domain/value-objects/delivery-type";
import { OneToMany } from "typeorm";
import { SaleOrderItemEntity } from "./sale-order-item.entity";

@Entity("sale_orders")
@Index("idx_sale_orders_client", ["clientId"])
@Index("idx_sale_orders_source", ["sourceId"])
@Index("idx_sale_orders_created_by", ["createdBy"])
@Index("idx_sale_orders_schedule_date", ["scheduleDate"])
@Index("idx_sale_orders_warehouse", ["warehouseId"])
export class SaleOrderEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 10, nullable: true })
  serie?: string | null;

  @Column({ type: "int", nullable: true })
  correlative?: number | null;

  @Column({ name: "schedule_date", type: "date", nullable: true })
  scheduleDate?: string | null;

  @Column({ name: "delivery_date", type: "date", nullable: true })
  deliveryDate?: string | null;

  @Column({ name: "delivery_type", type: "enum", enum: DeliveryType, enumName: "delivery_type", nullable: true })
  deliveryType?: DeliveryType | null;

  @Column({ name: "sub_total", type: "numeric", precision: 12, scale: 2, default: 0 })
  subTotal: number;

  @Column({ name: "delivery_cost", type: "numeric", precision: 12, scale: 2, default: 0 })
  deliveryCost: number;

  @Column({ name: "total", type: "numeric", precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: "note", type: "text", nullable: true })
  note?: string | null;

  @Column({ name: "client_id", type: "uuid" })
  clientId: string;

  @Column({ name: "agency_detail", type: "text", nullable: true })
  agencyDetail?: string | null;

  @Column({ name: "source_id", type: "uuid", nullable: true })
  sourceId?: string | null;

  @Column({ name: "warehouse_id", type: "uuid", nullable: true })
  warehouseId?: string | null;

  @Column({ name: "created_by", type: "uuid" })
  createdBy: string;

  @Column({ name: "agenda_status", type: "enum", enum: AgendaStatus, enumName: "agenda_status", default: AgendaStatus.COORDINATED })
  agendaStatus: AgendaStatus;

  @Column({ name: "delivery_status", type: "enum", enum: DeliveryStatus, enumName: "delivery_status", nullable: true })
  deliveryStatus?: DeliveryStatus | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", nullable: true })
  updatedAt?: Date | null;
  
  @OneToMany(() => SaleOrderItemEntity, (item) => item.saleOrder)
  items?: SaleOrderItemEntity[];
}
