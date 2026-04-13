import { BadRequestException, Inject, InternalServerErrorException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Warehouse } from "src/modules/warehouses/domain/entities/warehouse";
import { CreateWarehouseInput } from "../../dtos/warehouse/input/create.input";
import { CreateProductCatalogDocumentSerieUseCase } from "src/modules/product-catalog/application/usecases/create-document-serie.usecase";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { successResponse } from "src/shared/response-standard/response";
import { CreateLocationUsecase } from "../location/create.usecase";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../ports/warehouse.repository.port";

export class CreateWarehouseUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly createSerieUseCase: CreateProductCatalogDocumentSerieUseCase,
    private readonly createLocation: CreateLocationUsecase,
  ) {}

  async execute(input: CreateWarehouseInput): Promise<{ message: string; type: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const warehouse = Warehouse.create({
        name: input.name,
        department: input.department,
        province: input.province,
        district: input.district,
        address: input.address,
        isActive: true,
        createdAt: this.clock.now(),
      });

      let created: Warehouse;
      try {
        created = await this.warehouseRepo.create(warehouse, tx);
      } catch {
        throw new BadRequestException("No se pudo crear el almacen");
      }

      const defaults = [
        { code: "IN", name: "Ingreso", docType: DocType.IN },
        { code: "OUT", name: "Salida", docType: DocType.OUT },
        { code: "TRF", name: "Transferencia", docType: DocType.TRANSFER },
        { code: "ADJ", name: "Ajuste", docType: DocType.ADJUSTMENT },
        { code: "PRO", name: "Ajuste", docType: DocType.PRODUCTION },
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
      } catch {
        throw new InternalServerErrorException("No se pudieron crear series por defecto");
      }

      try {
        await this.createLocation.execute(
          {
            warehouseId: created.warehouseId,
            code: "ANAQUEL 01",
          },
          tx,
        );
      } catch {
        throw new InternalServerErrorException("No se pudo crear la ubicacion inicial");
      }

      return successResponse("Almacen creado con exito");
    });
  }
}
