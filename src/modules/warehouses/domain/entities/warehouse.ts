import { randomUUID } from "crypto";
import { WarehouseId } from "../value-objects/warehouse-id.vo";
import { InvalidWarehouseError } from "../errors/invalid-warehouse.error";
import { WarehouseDomainService } from "../services/warehouse-domain.service";

export class Warehouse{
  private constructor(
    public readonly warehouseId: WarehouseId,
    public readonly name: string,
    public readonly department: string,
    public readonly province: string,
    public readonly district: string,
    public readonly address?: string,
    public readonly isActive?: boolean,
    public readonly createdAt?: Date,
  ) {}

  static create(params: {
    warehouseId?: WarehouseId;
    name: string;
    department: string;
    province: string;
    district: string;
    address?: string;
    isActive?: boolean;
    createdAt?: Date;
  }) {
    const name = params.name.trim();
    const department = params.department.trim();
    const province = params.province.trim();
    const district = params.district.trim();

    if (!name || !department || !province || !district) {
      throw new InvalidWarehouseError();
    }

    return new Warehouse(
      params.warehouseId ?? new WarehouseId(randomUUID()),
      name,
      department,
      province,
      district,
      WarehouseDomainService.normalizeText(params.address),
      params.isActive ?? true,
      params.createdAt,
    );
  }
}
