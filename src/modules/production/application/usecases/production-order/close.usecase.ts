import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { PostProductionDocumentsUseCase } from "./post-production-documents.usecase";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";
import { BuildConsumptionFromRecipesUseCase } from "./build-consumption-from-recipes.usecase";
import { ReserveProductCatalogMaterials } from "src/modules/product-catalog/application/usecases/reserve-materials.usecase";

@Injectable()
export class CloseProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    private readonly consumeReserved: ConsumeReservedMaterialsUseCase,
    private readonly buildConsumption: BuildConsumptionFromRecipesUseCase,
    private readonly reserveSkuMaterials: ReserveProductCatalogMaterials,
    private readonly postDocs: PostProductionDocumentsUseCase,
  ) {}

  async execute(
    params: { productionId: string; postedBy?: string },
    tx?: TransactionContext,
  ): Promise<{ message: string }> {
    const run = async (ctx?: TransactionContext) => {
      const result = await this.orderRepo.getByIdWithItems(params.productionId, ctx);
      if (!result) {
        throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
      }

      const { items, order } = result;
      try {
        order.assertCanClose();
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }

      const consumption = await this.buildConsumption.execute({ productionId: params.productionId }, ctx!);
      const legacyConsumption: RecipeConsumptionLine[] = [];
      const skuConsumption = consumption.filter((line) => line.mode === "sku");
      for (const line of consumption) {
        if (line.mode !== "sku") legacyConsumption.push(line);
      }

      if (legacyConsumption.length) {
        try {
          await this.consumeReserved.execute(
            {
              warehouseId: order.fromWarehouseId,
              consumption: legacyConsumption,
              reserveMode: false,
            },
            ctx,
          );
        } catch (err) {
          if (err instanceof BadRequestException) throw err;
          throw new InternalServerErrorException("Error al consumir stock reservado");
        }
      }

      if (skuConsumption.length) {
        try {
          await this.reserveSkuMaterials.execute({
            warehouseId: order.fromWarehouseId,
            consumption: skuConsumption.map((line) => ({
              stockItemId: line.stockItemId,
              locationId: line.locationId,
              qty: line.qty,
            })),
            reserveMode: false,
          });
        } catch (err) {
          if (err instanceof BadRequestException) throw err;
          throw new InternalServerErrorException("Error al consumir reserva SKU");
        }
      }

      await this.postDocs.execute(
        { order, items, consumption, postedBy: params.postedBy },
        ctx!,
      );

      await this.orderRepo.setStatus(
        {
          productionId: params.productionId,
          status: ProductionStatus.COMPLETED,
        },
        ctx,
      );

      return { message: "Orden de produccion completada" };
    };

    if (tx) return run(tx);
    return this.uow.runInTransaction((newTx) => run(newTx));
  }
}
