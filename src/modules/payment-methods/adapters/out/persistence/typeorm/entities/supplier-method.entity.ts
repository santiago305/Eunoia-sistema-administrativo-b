import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { SupplierEntity } from "src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity";
import { PaymentMethodEntity } from "./payment-method.entity";

@Entity("supplier_methods")
export class SupplierMethodEntity {
  @PrimaryColumn({ name: "supplier_id", type: "uuid" })
  supplierId: string;

  @PrimaryColumn({ name: "method_id", type: "uuid" })
  methodId: string;

  @ManyToOne(() => SupplierEntity)
  @JoinColumn({ name: "supplier_id" })
  supplier: SupplierEntity;

  @ManyToOne(() => PaymentMethodEntity)
  @JoinColumn({ name: "method_id" })
  method: PaymentMethodEntity;
}
