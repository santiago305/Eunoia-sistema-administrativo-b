import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("pc_units")
@Index("ux_pc_units_code", ["code"], { unique: true })
export class ProductCatalogUnitEntity {
  @PrimaryGeneratedColumn("uuid", { name: "unit_id" })
  id: string;

  @Column({ name: "name", type: "varchar", length: 180 })
  name: string;

  @Column({ name: "code", type: "varchar", length: 50 })
  code: string;

}
