import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from "typeorm";
import { UbigeoProvinceEntity } from "./ubigeo-province.entity";

@Entity({ name: "ubigeo_districts" })
@Unique("uq_ubigeo_districts_province_normalized_name", ["provinceId", "normalizedName"])
export class UbigeoDistrictEntity {
  @PrimaryColumn({ type: "varchar", length: 6 })
  id!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ name: "normalized_name", type: "varchar", length: 160 })
  normalizedName!: string;

  @Index("idx_ubigeo_districts_province_id")
  @Column({ name: "province_id", type: "varchar", length: 4 })
  provinceId!: string;

  @ManyToOne(() => UbigeoProvinceEntity, (province) => province.districts, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "province_id" })
  province!: UbigeoProvinceEntity;
}
