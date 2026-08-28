import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from 'src/modules/sale-orders/domain/ports/sale-order.repository';
import {
  UNIT_OF_WORK,
  UnitOfWork,
} from 'src/shared/domain/ports/unit-of-work.port';
import { SaleOrderWorkflowTransitionService } from '../services/sale-order-workflow-transition.service';

const MAX_AUTOMATIC_STEPS_PER_ORDER = 20;

@Injectable()
export class RunAutomaticWorkflowTransitionsJob {
  private readonly logger = new Logger(RunAutomaticWorkflowTransitionsJob.name);
  private scanCursorId: string | null = null;

  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly transitionService: SaleOrderWorkflowTransitionService,
  ) {}

  async run(input?: { limit?: number }) {
    const limit = input?.limit ?? 500;
    let ids = await this.saleOrderRepo.listIdsForAutomaticWorkflow(
      limit,
      this.scanCursorId,
    );
    if (!ids.length && this.scanCursorId) {
      this.scanCursorId = null;
      ids = await this.saleOrderRepo.listIdsForAutomaticWorkflow(limit, null);
    }
    this.scanCursorId = ids.length === limit ? ids[ids.length - 1] : null;
    let updated = 0;
    let failed = 0;
    const saleOrderIds: string[] = [];

    for (const saleOrderId of ids) {
      try {
        const result = await this.advanceSaleOrderUntilIdle(saleOrderId);
        if (result) {
          updated += 1;
          saleOrderIds.push(saleOrderId);
        }
      } catch (error) {
        failed += 1;
        this.logger.warn(
          `automatic workflow failed saleOrderId=${saleOrderId}: ${(error as Error).message}`,
        );
      }
    }

    return { found: ids.length, updated, failed, saleOrderIds };
  }

  async runForSaleOrder(input: { saleOrderId: string }) {
    try {
      const result = await this.advanceSaleOrderUntilIdle(input.saleOrderId);

      return {
        updated: result ? 1 : 0,
        failed: 0,
        saleOrderIds: result ? [input.saleOrderId] : [],
      };
    } catch (error) {
      this.logger.warn(
        `automatic workflow failed saleOrderId=${input.saleOrderId}: ${(error as Error).message}`,
      );
      return {
        updated: 0,
        failed: 1,
        saleOrderIds: [],
      };
    }
  }

  private async advanceSaleOrderUntilIdle(saleOrderId: string) {
    let updated = false;

    for (let step = 0; step < MAX_AUTOMATIC_STEPS_PER_ORDER; step += 1) {
      const result = await this.uow.runInTransaction((tx) =>
        this.transitionService.advanceAutomatic(saleOrderId, null, tx),
      );

      if (!result) {
        return updated;
      }

      updated = true;
    }

    throw new Error(
      `automatic workflow exceeded ${MAX_AUTOMATIC_STEPS_PER_ORDER} steps`,
    );
  }
}
