import { Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SUPPLIER_PAYMENT_DESTINATION_REPOSITORY, SupplierPaymentDestinationRepository } from "../../domain/ports/supplier-payment-destination.repository";
import { SupplierPaymentDestination } from "../../domain/entity/supplier-payment-destination";
import { SupplierPaymentDestinationOutputMapper } from "../mappers/supplier-payment-destination-output.mapper";
export class SetDefaultSupplierPaymentDestinationUsecase {
  constructor(@Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, @Inject(SUPPLIER_PAYMENT_DESTINATION_REPOSITORY) private readonly destinations: SupplierPaymentDestinationRepository) {}
  async execute(id: string) {
    return this.uow.runInTransaction(async (tx) => {
      const destination = await this.destinations.findById(id, tx);
      if (!destination) throw new NotFoundException("Destino de pago no encontrado");
      if (!destination.isActive || destination.requiresManualReview) throw new NotFoundException("El destino debe estar activo y revisado");
      await this.destinations.clearDefault({ supplierId: destination.supplierId, currency: destination.currency, type: destination.type, exceptId: id }, tx);
      const saved = await this.destinations.update(SupplierPaymentDestination.create({ ...destination, isDefault: true }), tx);
      return saved ? SupplierPaymentDestinationOutputMapper.toOutput(saved) : null;
    });
  }
}
