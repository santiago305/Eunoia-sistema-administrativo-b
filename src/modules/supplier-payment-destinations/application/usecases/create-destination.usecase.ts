import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { hashPaymentAccountIdentifier } from "src/modules/company-payment-accounts/infrastructure/security/payment-account-sensitive-data";
import { SupplierPaymentDestination } from "../../domain/entity/supplier-payment-destination";
import { SUPPLIER_PAYMENT_DESTINATION_REPOSITORY, SupplierPaymentDestinationRepository } from "../../domain/ports/supplier-payment-destination.repository";
import { assertDestinationCompatible } from "../support/supplier-payment-destination-policy";
import { SupplierPaymentDestinationOutputMapper } from "../mappers/supplier-payment-destination-output.mapper";

export class CreateSupplierPaymentDestinationUsecase {
  constructor(@Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, @Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository, @Inject(PAYMENT_METHOD_REPOSITORY) private readonly methods: PaymentMethodRepository, @Inject(SUPPLIER_PAYMENT_DESTINATION_REPOSITORY) private readonly destinations: SupplierPaymentDestinationRepository) {}
  async execute(input: any) {
    return this.uow.runInTransaction(async (tx) => {
      if (!await this.suppliers.findById(input.supplierId, tx)) throw new NotFoundException("Proveedor no encontrado");
      const method = await this.methods.findById(input.methodId, tx);
      if (!method || !method.isActive) throw new NotFoundException("Método de pago no encontrado o inactivo");
      assertDestinationCompatible(method.code, input.type);
      const destination = SupplierPaymentDestination.create(input);
      const hash = hashPaymentAccountIdentifier({ type: destination.type, institutionName: destination.institutionName, walletProvider: destination.providerName, accountNumber: destination.accountNumber, cci: destination.cci, walletPhone: destination.walletIdentifier, cardLastFour: destination.accountLastFour });
      if (await this.destinations.findDuplicate({ supplierId: destination.supplierId, methodId: destination.methodId, currency: destination.currency, sensitiveHash: hash }, tx)) throw new ConflictException("El destino de pago ya existe");
      try {
        if (destination.isDefault) await this.destinations.clearDefault({ supplierId: destination.supplierId, currency: destination.currency, type: destination.type }, tx);
        const saved = await this.destinations.create(destination, tx);
        return SupplierPaymentDestinationOutputMapper.toOutput(saved);
      } catch (error: any) {
        if (error?.code === "23505") throw new ConflictException("El destino de pago ya existe");
        throw new BadRequestException(error?.message ?? "No se pudo crear el destino de pago");
      }
    });
  }
}
