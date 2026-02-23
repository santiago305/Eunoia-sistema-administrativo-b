import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("supplier_variants")
export class SupplierVariantEntity {
  @PrimaryColumn({ name: "supplier_id", type: "uuid" })
  supplierId: string;

  @PrimaryColumn({ name: "variant_id", type: "uuid" })
  variantId: string;

  @Column({ name: "supplier_sku", type: "varchar", length: 80, nullable: true })
  supplierSku?: string | null;

  @Column({ name: "last_cost", type: "numeric", precision: 12, scale: 2, nullable: true })
  lastCost?: number | null;

  @Column({ name: "lead_time_days", type: "int", nullable: true })
  leadTimeDays?: number | null;
}
