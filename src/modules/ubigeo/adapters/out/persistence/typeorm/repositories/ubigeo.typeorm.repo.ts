import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { UbigeoDepartment } from "src/modules/ubigeo/domain/entities/ubigeo-department";
import { UbigeoDistrict } from "src/modules/ubigeo/domain/entities/ubigeo-district";
import { UbigeoProvince } from "src/modules/ubigeo/domain/entities/ubigeo-province";
import {
  UbigeoByCodeRecord,
  UbigeoCatalog,
  UbigeoRepository,
} from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { UbigeoDepartmentEntity } from "../entities/ubigeo-department.entity";
import { UbigeoDistrictEntity } from "../entities/ubigeo-district.entity";
import { UbigeoProvinceEntity } from "../entities/ubigeo-province.entity";

@Injectable()
export class UbigeoTypeormRepository implements UbigeoRepository {
  constructor(
    @InjectRepository(UbigeoDepartmentEntity)
    private readonly departmentsRepo: Repository<UbigeoDepartmentEntity>,
    @InjectRepository(UbigeoProvinceEntity)
    private readonly provincesRepo: Repository<UbigeoProvinceEntity>,
    @InjectRepository(UbigeoDistrictEntity)
    private readonly districtsRepo: Repository<UbigeoDistrictEntity>,
  ) {}

  async getCatalog(): Promise<UbigeoCatalog> {
    const [departments, provinces, districts] = await Promise.all([
      this.departmentsRepo.find({ order: { id: "ASC" } }),
      this.provincesRepo.find({ order: { id: "ASC" } }),
      this.districtsRepo.find({ order: { id: "ASC" } }),
    ]);

    return {
      departments: departments.map((department) => this.toDepartmentDomain(department)),
      provinces: provinces.map((province) => this.toProvinceDomain(province)),
      districts: districts.map((district) => this.toDistrictDomain(district)),
    };
  }

  async listDepartments(): Promise<UbigeoDepartment[]> {
    const rows = await this.departmentsRepo.find({ order: { id: "ASC" } });
    return rows.map((row) => this.toDepartmentDomain(row));
  }

  async findDepartmentById(departmentId: string): Promise<UbigeoDepartment | null> {
    const row = await this.departmentsRepo.findOne({ where: { id: departmentId } });
    return row ? this.toDepartmentDomain(row) : null;
  }

  async findDepartmentsByIds(departmentIds: string[]): Promise<UbigeoDepartment[]> {
    if (!departmentIds.length) return [];

    const rows = await this.departmentsRepo.find({
      where: { id: In(departmentIds) },
      order: { id: "ASC" },
    });

    return rows.map((row) => this.toDepartmentDomain(row));
  }

  async findDepartmentByNormalizedName(normalizedName: string): Promise<UbigeoDepartment | null> {
    const row = await this.departmentsRepo.findOne({ where: { normalizedName } });
    return row ? this.toDepartmentDomain(row) : null;
  }

  async listProvincesByDepartmentIds(departmentIds: string[]): Promise<UbigeoProvince[]> {
    if (!departmentIds.length) return [];

    const rows = await this.provincesRepo.find({
      where: { departmentId: In(departmentIds) },
      order: { departmentId: "ASC", id: "ASC" },
    });

    return rows.map((row) => this.toProvinceDomain(row));
  }

  async findProvinceById(provinceId: string): Promise<UbigeoProvince | null> {
    const row = await this.provincesRepo.findOne({ where: { id: provinceId } });
    return row ? this.toProvinceDomain(row) : null;
  }

  async findProvincesByIds(provinceIds: string[]): Promise<UbigeoProvince[]> {
    if (!provinceIds.length) return [];

    const rows = await this.provincesRepo.find({
      where: { id: In(provinceIds) },
      order: { id: "ASC" },
    });

    return rows.map((row) => this.toProvinceDomain(row));
  }

  async findProvinceByNormalizedName(
    departmentId: string,
    normalizedName: string,
  ): Promise<UbigeoProvince | null> {
    const row = await this.provincesRepo.findOne({
      where: {
        departmentId,
        normalizedName,
      },
    });

    return row ? this.toProvinceDomain(row) : null;
  }

  async listDistrictsByProvinceIds(provinceIds: string[]): Promise<UbigeoDistrict[]> {
    if (!provinceIds.length) return [];

    const rows = await this.districtsRepo.find({
      where: { provinceId: In(provinceIds) },
      order: { provinceId: "ASC", id: "ASC" },
    });

    return rows.map((row) => this.toDistrictDomain(row));
  }

  async findByDistrictCode(code: string): Promise<UbigeoByCodeRecord | null> {
    const row = await this.districtsRepo.findOne({
      where: { id: code },
      relations: {
        province: {
          department: true,
        },
      },
    });

    if (!row) return null;

    return {
      department: this.toDepartmentDomain(row.province.department),
      province: this.toProvinceDomain(row.province),
      district: this.toDistrictDomain(row),
    };
  }

  private toDepartmentDomain(row: UbigeoDepartmentEntity): UbigeoDepartment {
    return new UbigeoDepartment(row.id, row.name);
  }

  private toProvinceDomain(row: UbigeoProvinceEntity): UbigeoProvince {
    return new UbigeoProvince(row.id, row.name, row.departmentId);
  }

  private toDistrictDomain(row: UbigeoDistrictEntity): UbigeoDistrict {
    return new UbigeoDistrict(row.id, row.name, row.provinceId, row.provinceId.slice(0, 2));
  }
}
