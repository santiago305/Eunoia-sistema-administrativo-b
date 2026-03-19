import { BadRequestException, Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { ProductionOrder } from "src/modules/production/domain/entity/production-order.entity";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { CreateProductionOrderInput } from "../../dto/production-order/input/create-production-order";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { DocumentSeriesRepository, SERIES_REPOSITORY } from "src/modules/inventory/domain/ports/document-series.repository.port";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { errorResponse } from "src/shared/response-standard/response";
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
    private readonly ItemProduction: AddProductionOrderItem
  ) {}

  async execute(input: CreateProductionOrderInput, userId:string): Promise<{type:string,message:string}> {
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

      const order = new ProductionOrder(
        undefined,
        input.fromWarehouseId,
        input.toWarehouseId,
        DocType.PRODUCTION,
        input.serieId,
        correlative,
        ProductionStatus.DRAFT,
        input.manufactureDate,
        userId,
        this.clock.now(),
        input.reference,
        null,
        null,
      );

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
          message: '¡Orden de producción creada con exito!'
      } 
    });
  }
}
