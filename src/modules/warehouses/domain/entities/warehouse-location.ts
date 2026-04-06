import { randomUUID } from "crypto";
import { LocationId } from "../value-objects/location-id.vo";
import { WarehouseId } from "../value-objects/warehouse-id.vo";
import { InvalidLocationError } from "../errors/invalid-location.error";
import { WarehouseDomainService } from "../services/warehouse-domain.service";

export class WarehouseLocation{
  private constructor(
    public readonly locationId: LocationId,
    public readonly warehouseId: WarehouseId,
    public readonly code: string,
    public readonly description?: string,
    public readonly isActive?: boolean,
  ) {}

  static create(params: {
    locationId?: LocationId;
    warehouseId: WarehouseId;
    code: string;
    description?: string;
    isActive?: boolean;
  }) {
    const code = params.code.trim();
    if (!code) {
      throw new InvalidLocationError();
    }

    return new WarehouseLocation(
      params.locationId ?? new LocationId(randomUUID()),
      params.warehouseId,
      code,
      WarehouseDomainService.normalizeText(params.description),
      params.isActive ?? true,
    );
  }
}
