import { BadRequestException, Inject, InternalServerErrorException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "src/modules/warehouses/domain/ports/warehouse.repository.port";
import { Warehouse } from "src/modules/warehouses/domain/entities/warehouse";
import { CreateWarehouseInput } from "../../dtos/warehouse/input/create.input";

import { CreateDocumentSerieUseCase } from "src/modules/inventory/application/use-cases/document-serie/create-document-serie.usecase";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { errorResponse, successResponse } from "src/shared/response-standard/response";
import { CreateLocationUsecase } from "../location/create.usecase";

export class CreateWarehouseUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly createSerieUseCase: CreateDocumentSerieUseCase,
    private readonly createLocation: CreateLocationUsecase,
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
        throw new BadRequestException(errorResponse("No se pudo crear el almacen"));
      }

      const defaults = [
        { code: `IN`, name: "Ingreso", docType: DocType.IN },
        { code: `OUT`, name: "Salida", docType: DocType.OUT },
        { code: `TRF`, name: "Transferencia", docType: DocType.TRANSFER },
        { code: `ADJ`, name: "Ajuste", docType: DocType.ADJUSTMENT },
        { code: `PRO`, name: "Ajuste", docType: DocType.PRODUCTION },
      ];

      try {
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
      } catch{
        throw new InternalServerErrorException(errorResponse('No se pudieron crear series por defecto'));
      }
      try {
        const location = {
          warehouseId: created.warehouseId,
          code: 'ANAQUEL 01'
        }
        await this.createLocation.execute(location, tx);
      } catch(err){
        throw new InternalServerErrorException(errorResponse(err));
      }

      return successResponse("¡Almacen creado con exito!");
    });
  }
}
