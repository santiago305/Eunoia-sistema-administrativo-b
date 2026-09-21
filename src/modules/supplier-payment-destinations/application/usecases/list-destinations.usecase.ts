import { Inject } from "@nestjs/common";
import { SUPPLIER_PAYMENT_DESTINATION_REPOSITORY, SupplierPaymentDestinationRepository } from "../../domain/ports/supplier-payment-destination.repository";
import { SupplierPaymentDestinationOutputMapper } from "../mappers/supplier-payment-destination-output.mapper";
export class ListSupplierPaymentDestinationsUsecase {
  constructor(@Inject(SUPPLIER_PAYMENT_DESTINATION_REPOSITORY) private readonly destinations: SupplierPaymentDestinationRepository) {}
  async execute(input: { supplierId: string; currency?: string; methodId?: string; includeInactive?: boolean }) {
    const items = await this.destinations.listBySupplier(input.supplierId, input, undefined);
    return items.map(SupplierPaymentDestinationOutputMapper.toOutput);
  }
}
