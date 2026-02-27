import { BadRequestException, ConflictException, Inject, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { UpdateSupplierInput } from "../../dtos/supplier/input/update.input";

export class UpdateSupplierUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: UpdateSupplierInput): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.supplierRepo.findById(input.supplierId, tx);
      if (!current) {
        throw new NotFoundException({
          type: "error",
          message: "Proveedor no encontrado"
        });
      }
      if (!current.isActive) {
        throw new BadRequestException({
          type: "error",
          message: "No puedes actualizar un proveedor deshabilitado"
        });
      }

      try {
        const updated = await this.supplierRepo.update(
          {
            supplierId: input.supplierId,
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
            isActive: input.isActive,
            updatedAt: this.clock.now(),
          },
          tx,
        );
  
        if (!updated) {
          throw new InternalServerErrorException({
            type: "error",
            message: "¡No se logro actualizar el proveedor, intenta nuevamente!"
          });
        }
      } catch {
        throw new ConflictException({
          type: "error",
          message: "Documento ya registrado",
        });
      }

      return { type: "success", message: "Proveedor actualizado con exito" };
    });
  }
}
