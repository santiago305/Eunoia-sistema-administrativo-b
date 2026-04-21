import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Unique,
} from "typeorm";
import { UbigeoDepartmentEntity } from "./ubigeo-department.entity";
import { UbigeoDistrictEntity } from "./ubigeo-district.entity";

@Entity({ name: "ubigeo_provinces" })
@Unique("uq_ubigeo_provinces_department_normalized_name", ["departmentId", "normalizedName"])
export class UbigeoProvinceEntity {
  @PrimaryColumn({ type: "varchar", length: 4 })
  id!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ name: "normalized_name", type: "varchar", length: 160 })
  normalizedName!: string;

  @Index("idx_ubigeo_provinces_department_id")
  @Column({ name: "department_id", type: "varchar", length: 2 })
  departmentId!: string;

  @ManyToOne(() => UbigeoDepartmentEntity, (department) => department.provinces, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "department_id" })
  department!: UbigeoDepartmentEntity;

  @OneToMany(() => UbigeoDistrictEntity, (district) => district.province)
  districts!: UbigeoDistrictEntity[];
}
