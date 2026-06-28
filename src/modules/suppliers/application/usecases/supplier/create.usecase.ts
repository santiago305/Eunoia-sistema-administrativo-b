import { ConflictException, Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { CreateSupplierInput } from "../../dtos/supplier/input/create.input";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { SupplierFactory } from "src/modules/suppliers/domain/factories/supplier.factory";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { SUPPLIER_METHOD_REPOSITORY, SupplierMethodRepository } from "src/modules/payment-methods/domain/ports/supplier-method.repository";
import { PaymentMethodFactory } from "src/modules/payment-methods/domain/factories/payment-method.factory";
import { resolveRequiresVoucher } from "src/modules/payment-methods/domain/services/payment-method-voucher-policy";

export class CreateSupplierUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
    @Inject(SUPPLIER_METHOD_REPOSITORY)
    private readonly supplierMethodRepo: SupplierMethodRepository,
  ) {}

  async execute(input: CreateSupplierInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const exists = await this.supplierRepo.findByDocument(input.documentType, input.documentNumber, tx);
      if (exists) {
        throw new ConflictException("Proveedor ya existe");
      }

      const now = this.clock.now();
      const supplier = SupplierFactory.createSupplier({
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        name: input.name,
        lastName: input.lastName,
        tradeName: input.tradeName,
        address: input.address,
        phone: input.phone,
        email: input.email,
        note: input.note,
        leadTimeDays: input.leadTimeDays,
        isActive: input.isActive ?? true,
        createdAt: now,
      });

      try {
        const savedSupplier = await this.supplierRepo.create(supplier, tx);
        const cashMethod = (await this.paymentMethodRepo.getRecords(tx)).find(
          (method) => method.name.trim().toUpperCase() === "EFECTIVO",
        );

        if (savedSupplier && cashMethod?.methodId) {
          const existingCash = await this.supplierMethodRepo.findDuplicate(
            savedSupplier.supplierId,
            cashMethod.methodId,
            null,
            tx,
          );

          if (!existingCash) {
            await this.supplierMethodRepo.create(
              PaymentMethodFactory.createSupplierMethod({
                supplierId: savedSupplier.supplierId,
                methodId: cashMethod.methodId,
                number: null,
                isDefault: true,
                requiresVoucher: resolveRequiresVoucher(cashMethod.name),
              }),
              tx,
            );
          }
        }
      } catch {
        throw new ConflictException("Proveedor ya existe");
      }

      return { message: "Proveedor creado con exito" };
    });
  }
}

