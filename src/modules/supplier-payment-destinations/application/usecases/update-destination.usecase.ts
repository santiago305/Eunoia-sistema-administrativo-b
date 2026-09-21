import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { SUPPLIER_PAYMENT_DESTINATION_REPOSITORY, SupplierPaymentDestinationRepository } from "../../domain/ports/supplier-payment-destination.repository";
import { SupplierPaymentDestination } from "../../domain/entity/supplier-payment-destination";
import { assertDestinationCompatible } from "../support/supplier-payment-destination-policy";
import { SupplierPaymentDestinationOutputMapper } from "../mappers/supplier-payment-destination-output.mapper";

export class UpdateSupplierPaymentDestinationUsecase {
  constructor(@Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, @Inject(PAYMENT_METHOD_REPOSITORY) private readonly methods: PaymentMethodRepository, @Inject(SUPPLIER_PAYMENT_DESTINATION_REPOSITORY) private readonly destinations: SupplierPaymentDestinationRepository) {}
  async execute(id: string, patch: any) {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.destinations.findById(id, tx);
      if (!current) throw new NotFoundException("Destino de pago no encontrado");
      const methodId = patch.methodId ?? current.methodId;
      const method = await this.methods.findById(methodId, tx);
      if (!method || !method.isActive) throw new BadRequestException("Método de pago no encontrado o inactivo");
      const destination = SupplierPaymentDestination.create({ ...current, ...patch, id, methodId, supplierId: current.supplierId, currency: patch.currency ?? current.currency, type: patch.type ?? current.type, name: patch.name ?? current.name, accountNumber: patch.accountNumber ?? current.accountNumber, cci: patch.cci ?? current.cci, walletIdentifier: patch.walletIdentifier ?? current.walletIdentifier, holderDocument: patch.holderDocument ?? current.holderDocument });
      assertDestinationCompatible(method.code, destination.type);
      if (destination.isDefault) await this.destinations.clearDefault({ supplierId: destination.supplierId, currency: destination.currency, type: destination.type, exceptId: id }, tx);
      const saved = await this.destinations.update(destination, tx);
      if (!saved) throw new NotFoundException("Destino de pago no encontrado");
      return SupplierPaymentDestinationOutputMapper.toOutput(saved);
    });
  }
}
