import { BadRequestException, Inject } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/domain/ports/warehouse.repository.port";
import { Warehouse } from "src/modules/warehouses/domain/entities/warehouse";
import { CreateWarehouseInput } from "../../dtos/warehouse/input/create.input";

import { CreateDocumentSerieUseCase } from "src/modules/inventory/application/use-cases/document-serie/create-document-serie.usecase";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";

export class CreateWarehouseUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly createSerieUseCase: CreateDocumentSerieUseCase,
  ) {}

  async execute(input: CreateWarehouseInput): Promise<{ message: string; type: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const existing = await this.warehouseRepo.findByName(input.name, tx);
      if (existing) {
        throw new BadRequestException({ type: "error", message: "Ya existe un almacén con ese nombre" });
      }

      const warehouse = new Warehouse(
        undefined,
        input.name,
        input.department,
        input.province,
        input.district,
        input.address,
        true,
        this.clock.now(),
      );

      let created: Warehouse;
      try {
        created = await this.warehouseRepo.create(warehouse, tx);
      } catch {
        throw new BadRequestException({ type: "error", message: "No se pudo crear el almacen" });
      }

      const defaults = [
        { code: `IN-${input.name.slice(3)}`, name: "Ingreso", docType: DocType.IN },
        { code: `OUT-${input.name.slice(3)}`, name: "Salida", docType: DocType.OUT },
        { code: `TRF-${input.name.slice(3)}`, name: "Transferencia", docType: DocType.TRANSFER },
        { code: `ADJ-${input.name.slice(3)}`, name: "Ajuste", docType: DocType.ADJUSTMENT },
      ];

      for (const d of defaults) {
        await this.createSerieUseCase.execute({
          code: d.code,
          name: d.name,
          docType: d.docType,
          warehouseId: created.warehouseId.value,
          nextNumber: 1,
          padding: 6,
          separator: "-",
          isActive: true,
        });
      }

      return {
        message: "¡Varitante create con exito!",
        type: "success",
      };
    });
  }
}
