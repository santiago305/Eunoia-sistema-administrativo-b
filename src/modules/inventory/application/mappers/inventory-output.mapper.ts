import { AvailabilityOutput } from "../dto/inventory/output/availability-out";
import { InventorySnapshotOutput } from "../dto/inventory/output/inventory-snapshot";
import { Inventory } from "../../domain/entities/inventory";

export class InventoryOutputMapper {
  static toAvailabilityOutput(snapshot: Inventory): AvailabilityOutput {
    return {
      warehouseId: snapshot.warehouseId,
      stockItemId: snapshot.stockItemId,
      locationId: snapshot.locationId,
      onHand: snapshot.onHand,
      reserved: snapshot.reserved,
      available: snapshot.available,
    };
  }

  static toInventorySnapshotOutput(snapshot: Inventory): InventorySnapshotOutput {
    return this.toAvailabilityOutput(snapshot);
  }

  static emptyAvailability(params: {
    warehouseId: string;
    stockItemId: string;
    locationId?: string;
  }): AvailabilityOutput {
    return {
      warehouseId: params.warehouseId,
      stockItemId: params.stockItemId,
      locationId: params.locationId,
      onHand: 0,
      reserved: 0,
      available: 0,
    };
  }
}
