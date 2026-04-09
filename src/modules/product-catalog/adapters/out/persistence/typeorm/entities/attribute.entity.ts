import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("pc_attributes")
@Index("ux_pc_attributes_code", ["code"], { unique: true })
export class ProductCatalogAttributeEntity {
  @PrimaryGeneratedColumn("uuid", { name: "attribute_id" })
  id: string;

  @Column({ type: "varchar", length: 80 })
  code: string;

  @Column({ type: "varchar", length: 120 })
  name: string;
}
