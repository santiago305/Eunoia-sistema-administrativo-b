import { ConflictException, Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { CreateSupplierInput } from "../../dtos/supplier/input/create.input";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { SupplierFactory } from "src/modules/suppliers/domain/factories/supplier.factory";

export class CreateSupplierUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
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
        await this.supplierRepo.create(supplier, tx);
      } catch {
        throw new ConflictException("Proveedor ya existe");
      }

      return { message: "Proveedor creado con exito" };
    });
  }
}

