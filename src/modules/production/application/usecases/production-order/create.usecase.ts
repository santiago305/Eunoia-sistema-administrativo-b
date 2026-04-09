import { BadRequestException, Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { SERIES_REPOSITORY, DocumentSeriesRepository } from "src/modules/product-catalog/compat/ports/document-series.repository.port";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { ProductionOrder } from "src/modules/production/domain/entity/production-order.entity";
import { ProductionOrderFactory } from "src/modules/production/domain/factories/production-order.factory";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { CreateProductionOrderInput } from "../../dto/production-order/input/create-production-order";
import { ProductionOrderOutputMapper } from "../../mappers/production-order-output.mapper";
import { AddProductionOrderItem } from "./add-item.usecase";

@Injectable()
export class CreateProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly itemProduction: AddProductionOrderItem,
  ) {}

  async execute(input: CreateProductionOrderInput, userId: string) {
    return this.uow.runInTransaction(async (tx) => {
      if (!input.fromWarehouseId || !input.toWarehouseId || !input.serieId) {
        throw new BadRequestException("fromWarehouseId, toWarehouseId y serieId son obligatorios");
      }

      if (!input.manufactureDate) {
        throw new BadRequestException("manufactureDate es obligatorio");
      }

      const serie = await this.seriesRepo.findById(input.serieId);
      if (!serie) {
        throw new BadRequestException("Serie invalida");
      }

      const correlative = await this.seriesRepo.reserveNextNumber(input.serieId, tx);

      let order: ProductionOrder;
      try {
        order = ProductionOrderFactory.createNew({
          fromWarehouseId: input.fromWarehouseId,
          toWarehouseId: input.toWarehouseId,
          serieId: input.serieId,
          correlative,
          manufactureDate: input.manufactureDate,
          createdBy: userId,
          now: this.clock.now(),
          reference: input.reference,
        });
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }

      let created: ProductionOrder;
      try {
        created = await this.orderRepo.create(order, tx);
      } catch {
        throw new InternalServerErrorException("Error al crear orden de produccion");
      }

      try {
        for (const item of input.items ?? []) {
          await this.itemProduction.execute(
            {
              productionId: created.productionId,
              finishedItemId: item.finishedItemId,
              fromLocationId: item.fromLocationId,
              toLocationId: item.toLocationId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              type: item.type,
            },
            tx,
          );
        }
      } catch {
        throw new InternalServerErrorException("Error al ingresar items");
      }

      return {
        type: "success",
        message: "Orden de produccion creada con exito",
        order: ProductionOrderOutputMapper.toOrderOutput(created),
      };
    });
  }
}



