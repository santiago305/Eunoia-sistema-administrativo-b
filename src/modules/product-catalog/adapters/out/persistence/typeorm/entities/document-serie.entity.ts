import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { DocType } from "src/shared/domain/value-objects/doc-type";

@Entity("document_series")
@Index(["warehouseId", "code"], { unique: true })
export class ProductCatalogDocumentSerieEntity {
  @PrimaryGeneratedColumn("uuid", { name: "serie_id" })
  id: string;

  @Column({ type: "varchar", length: 250 })
  code: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 80, name: "doc_type" })
  docType: DocType;

  @Column({ type: "uuid", name: "warehouse_id" })
  warehouseId: string;

  @Column({ type: "integer", name: "next_number", default: 1 })
  nextNumber: number;

  @Column({ type: "smallint", default: 50 })
  padding: number;

  @Column({ type: "varchar", length: 50, default: "-" })
  separator: string;

  @Column({ type: "boolean", name: "is_active", default: true })
  isActive: boolean;

  @Column({ type: "timestamp", name: "created_at", default: () => "now()" })
  createdAt: Date;
}
