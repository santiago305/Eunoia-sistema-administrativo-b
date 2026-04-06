import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { SUPPLIER_METHOD_REPOSITORY, SupplierMethodRepository } from "src/modules/payment-methods/domain/ports/supplier-method.repository";
import { CreateSupplierMethodInput } from "../../dtos/supplier-method/input/create.input";
import { PaymentMethodFactory } from "src/modules/payment-methods/domain/factories/payment-method.factory";
import { PaymentMethodNotFoundError } from "../../errors/payment-method-not-found.error";

export class CreateSupplierMethodUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
    @Inject(SUPPLIER_METHOD_REPOSITORY)
    private readonly supplierMethodRepo: SupplierMethodRepository,
  ) {}

  async execute(input: CreateSupplierMethodInput) {
    return this.uow.runInTransaction(async (tx) => {
      const supplier = await this.supplierRepo.findById(input.supplierId, tx);
      if (!supplier) {
        throw new NotFoundException("Proveedor no encontrado");
      }

      const method = await this.paymentMethodRepo.findById(input.methodId, tx);
      if (!method) {
        throw new NotFoundException(new PaymentMethodNotFoundError().message);
      }

      const existing = await this.supplierMethodRepo.findById(input.supplierId, input.methodId, tx);
      if (existing) {
        throw new ConflictException("La relacion ya existe");
      }

      const relation = PaymentMethodFactory.createSupplierMethod(input);
      try {
        await this.supplierMethodRepo.create(relation, tx);
        return successResponse("Relacion creada correctamente", {
          supplierId: input.supplierId,
          methodId: input.methodId,
          number: input.number,
        });
      } catch {
        throw new BadRequestException("No se pudo crear la relacion");
      }
    });
  }
}
