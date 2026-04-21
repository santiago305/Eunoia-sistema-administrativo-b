import { Column, Entity, OneToMany, PrimaryColumn, Unique } from "typeorm";
import { UbigeoProvinceEntity } from "./ubigeo-province.entity";

@Entity({ name: "ubigeo_departments" })
@Unique("uq_ubigeo_departments_normalized_name", ["normalizedName"])
export class UbigeoDepartmentEntity {
  @PrimaryColumn({ type: "varchar", length: 2 })
  id!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ name: "normalized_name", type: "varchar", length: 160 })
  normalizedName!: string;

  @OneToMany(() => UbigeoProvinceEntity, (province) => province.department)
  provinces!: UbigeoProvinceEntity[];
}
