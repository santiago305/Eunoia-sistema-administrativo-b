import { ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Supplier } from "src/modules/suppliers/domain/entity/supplier";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { CreateSupplierInput } from "../../dtos/supplier/input/create.input";

export class CreateSupplierUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateSupplierInput): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const exists = await this.supplierRepo.findByDocument(input.documentType, input.documentNumber, tx);
      if (exists) {
        throw new ConflictException(
          {
            type:'error',
            message: "Proveedor ya existe"
          });
      }

      const now = this.clock.now();
      const supplier = new Supplier(
        undefined,
        input.documentType,
        input.documentNumber,
        input.name,
        input.lastName,
        input.tradeName,
        input.address,
        input.phone,
        input.email,
        input.note,
        input.leadTimeDays,
        input.isActive ?? true,
        now,
        undefined,
      );

       try {
        await this.supplierRepo.create(supplier, tx);
        } catch {
          throw new ConflictException({
            type: "error",
            message: "Proveedor ya existe",
          });;
        }

        return { type: "success", message: "Proveedor creado con exito" };
      });
  }
}
