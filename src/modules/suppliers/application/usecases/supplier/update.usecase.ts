import {
  BadRequestException,
  ConflictException,
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { UpdateSupplierInput } from "../../dtos/supplier/input/update.input";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { SupplierNotFoundError } from "../../errors/supplier-not-found.error";

export class UpdateSupplierUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: UpdateSupplierInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.supplierRepo.findById(input.supplierId, tx);
      if (!current) {
        throw new NotFoundException(new SupplierNotFoundError().message);
      }

      if (!current.isActive) {
        throw new BadRequestException("No puedes actualizar un proveedor deshabilitado");
      }

      try {
        const next = current.update({
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
        });

        const updated = await this.supplierRepo.update(
          {
            supplierId: input.supplierId,
            documentType: next.documentType,
            documentNumber: next.documentNumber,
            name: next.name,
            lastName: next.lastName,
            tradeName: next.tradeName,
            address: next.address,
            phone: next.phone,
            email: next.email,
            note: next.note,
            leadTimeDays: next.leadTimeDays,
            isActive: next.isActive,
            updatedAt: next.updatedAt,
          },
          tx,
        );

        if (!updated) {
          throw new InternalServerErrorException(
            "No se logro actualizar el proveedor, intenta nuevamente",
          );
        }
      } catch (error) {
        if (error instanceof NotFoundException || error instanceof BadRequestException) {
          throw error;
        }
        if (error instanceof InternalServerErrorException) {
          throw error;
        }
        throw new ConflictException("Documento ya registrado");
      }

      return { message: "Proveedor actualizado con exito" };
    });
  }
}

