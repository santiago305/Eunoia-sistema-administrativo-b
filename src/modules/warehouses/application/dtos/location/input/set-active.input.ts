import { LocationId } from "src/modules/warehouses/domain/value-objects/location-id.vo";

export interface SetActiveInput{
    isActive: boolean,
    locationId: LocationId
}