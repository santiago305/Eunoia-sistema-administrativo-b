import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { ProductionOrder } from "src/modules/production/domain/entity/production-order.entity";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { CreateProductionOrderInput } from "../../dto/production-order/input/create-production-order";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { DocumentSeriesRepository, SERIES_REPOSITORY } from "src/modules/inventory/domain/ports/document-series.repository.port";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";

@Injectable()
export class CreateProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(input: CreateProductionOrderInput, userId:string): Promise<{type:string,message:string}> {
    return this.uow.runInTransaction(async (tx) => {
      if (!input.fromWarehouseId || !input.toWarehouseId || !input.serieId) {
        throw new BadRequestException({
          type:'error',
          message:'fromWarehouseId, toWarehouseId y serieId son obligatorios'
        });
      }
      if (input.manufactureTime === undefined || input.manufactureTime === null) {
        throw new BadRequestException({
          type:'error',
          message:'manufactureTime es obligatorio'
        });
      }

      const serie = await this.seriesRepo.findById(input.serieId);
      if (!serie) {
        throw new BadRequestException(
          {
            type: 'error',
            message:'Serie invalida'
          }
        );
      }
      const correlative = await this.seriesRepo.reserveNextNumber(input.serieId, tx);

      const order = new ProductionOrder(
        undefined,
        input.fromWarehouseId,
        input.toWarehouseId,
        input.serieId,
        correlative,
        ProductionStatus.DRAFT,
        input.manufactureTime,
        userId,
        this.clock.now(),
        input.reference,
        null,
        null,
      );

      await this.orderRepo.create(order, tx);

      return {
          type:'success',
          message: '¡Orden de producción creada con exito!'
      } 
    });
  }
}
