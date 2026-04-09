import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("supplier_skus")
export class SupplierSkuEntity {
  @PrimaryColumn({ name: "supplier_id", type: "uuid" })
  supplierId: string;

  @PrimaryColumn({ name: "sku_id", type: "uuid" })
  skuId: string;

  @Column({ name: "supplier_sku", type: "varchar", length: 80, nullable: true })
  supplierSku?: string | null;

  @Column({ name: "last_cost", type: "numeric", precision: 12, scale: 2, nullable: true })
  lastCost?: number | null;

  @Column({ name: "lead_time_days", type: "int", nullable: true })
  leadTimeDays?: number | null;
}
