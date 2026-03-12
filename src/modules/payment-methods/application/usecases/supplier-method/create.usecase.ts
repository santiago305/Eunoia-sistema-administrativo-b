import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse, errorResponse } from "src/shared/response-standard/response";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { SUPPLIER_METHOD_REPOSITORY, SupplierMethodRepository } from "src/modules/payment-methods/domain/ports/supplier-method.repository";
import { SupplierMethod } from "src/modules/payment-methods/domain/entity/supplier-method";
import { CreateSupplierMethodInput } from "../../dtos/supplier-method/input/create.input";

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
        throw new NotFoundException(errorResponse("Proveedor no encontrado"));
      }

      const method = await this.paymentMethodRepo.findById(input.methodId, tx);
      if (!method) {
        throw new NotFoundException(errorResponse("Metodo de pago no encontrado"));
      }

      const existing = await this.supplierMethodRepo.findById(input.supplierId, input.methodId, tx);
      if (existing) {
        throw new ConflictException(errorResponse("La relacion ya existe"));
      }

      const relation = new SupplierMethod(input.supplierId, input.methodId, input.number);
      try {
        await this.supplierMethodRepo.create(relation, tx);
        return successResponse("Relacion creada correctamente", {
          supplierId: input.supplierId,
          methodId: input.methodId,
          number: input.number,
        });
      } catch {
        throw new BadRequestException(errorResponse("No se pudo crear la relacion"));
      }
    });
  }
}
