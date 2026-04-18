import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

@Entity("pc_inventory_documents")
export class ProductCatalogInventoryDocumentEntity {
  @PrimaryGeneratedColumn("uuid", { name: "doc_id" })
  id: string;

  @Column({ name: "doc_type", type: "enum", enum: DocType, enumName: "inv_doc_type" })
  docType: DocType;

  @Column({ name: "product_type", type: "enum", enum: ProductCatalogProductType, enumName: "pc_product_type", nullable: true })
  productType: ProductCatalogProductType | null;

  @Column({ name: "status", type: "enum", enum: DocStatus, enumName: "inv_doc_status", default: DocStatus.DRAFT })
  status: DocStatus;

  @Column({ name: "serie_id", type: "uuid", nullable: true })
  serieId: string | null;

  @Column({ name: "correlative", type: "int", nullable: true })
  correlative: number | null;

  @Column({ name: "from_warehouse_id", type: "uuid", nullable: true })
  fromWarehouseId: string | null;

  @Column({ name: "to_warehouse_id", type: "uuid", nullable: true })
  toWarehouseId: string | null;

  @Column({ name: "reference_id", type: "uuid", nullable: true })
  referenceId: string | null;

  @Column({ name: "reference_type", type: "varchar", nullable: true })
  referenceType: ReferenceType | null;

  @Column({ name: "note", type: "text", nullable: true })
  note: string | null;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy: string | null;

  @Column({ name: "posted_by", type: "uuid", nullable: true })
  postedBy: string | null;

  @Column({ name: "posted_at", type: "timestamptz", nullable: true })
  postedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}

