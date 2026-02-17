
export interface WarehouseWithLocationsOutput {
  locations: {
    locationId: string,
    code: string,
    description?: string
  }[];
}
