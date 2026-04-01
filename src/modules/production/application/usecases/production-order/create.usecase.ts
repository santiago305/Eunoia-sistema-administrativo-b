import { BadRequestException, Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { ProductionOrder } from "src/modules/production/domain/entity/production-order.entity";
import { ProductionOrderFactory } from "src/modules/production/domain/factories/production-order.factory";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { CreateProductionOrderInput } from "../../dto/production-order/input/create-production-order";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";

import { errorResponse } from "src/shared/response-standard/response";
import { AddProductionOrderItem } from "./add-item.usecase";
import { CLOCK, ClockPort } from "src/modules/inventory/application/ports/clock.port";
import { SERIES_REPOSITORY, DocumentSeriesRepository } from "src/modules/inventory/application/ports/document-series.repository.port";

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
    private readonly ItemProduction: AddProductionOrderItem
  ) {}

  async execute(input: CreateProductionOrderInput, userId:string): Promise<{type:string,message:string
    productionId?:string
  }> {
    return this.uow.runInTransaction(async (tx) => {
      if (!input.fromWarehouseId || !input.toWarehouseId || !input.serieId) {
        throw new BadRequestException(
          errorResponse('fromWarehouseId, toWarehouseId y serieId son obligatorios')
        );
      }
      if (!input.manufactureDate) {
        throw new BadRequestException(errorResponse('manufactureDate es obligatorio'));
      }

      const serie = await this.seriesRepo.findById(input.serieId);
      if (!serie) {
        throw new BadRequestException(errorResponse('Serie invalida'));
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
          throw new BadRequestException(errorResponse(err.message));
        }
        throw err;
      }

      let created:ProductionOrder;
      try {
        created = await this.orderRepo.create(order, tx);
      } catch {
        throw new InternalServerErrorException(errorResponse('Error al crear orden de compra'));
      }
      
      try {
        for (const item of input.items ?? []) {
          await this.ItemProduction.execute(
            {
              productionId: created.productionId,
              finishedItemId: item.finishedItemId,
              fromLocationId: item.fromLocationId,
              toLocationId: item.toLocationId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              type: item.type
            },
            tx,
          );
        }
      } catch {
        throw new InternalServerErrorException(errorResponse('Error al ingresar items'));
      }

      return {
          type:'success',
          message: '¡Orden de producción creada con exito!',
          productionId: created.productionId
      } 
    });
  }
}
