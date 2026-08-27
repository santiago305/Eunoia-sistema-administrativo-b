import { Inject, Injectable } from '@nestjs/common';
import {
  INVENTORY_RESERVATION_DETAILS_QUERY,
  InventoryReservationDetailsQuery,
} from '../ports/inventory-reservation-details.query';
import { ProductCatalogProductType } from '../../domain/value-objects/product-type';

@Injectable()
export class ListProductCatalogInventoryReservations {
  constructor(
    @Inject(INVENTORY_RESERVATION_DETAILS_QUERY)
    private readonly query: InventoryReservationDetailsQuery,
  ) {}

  execute(params: {
    stockItemId: string;
    warehouseId: string;
    productType: ProductCatalogProductType;
  }) {
    return this.query.list(params);
  }
}
