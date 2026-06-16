import { Inject, Injectable, Logger } from "@nestjs/common";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SaleOrderWorkflowTransitionService } from "../services/sale-order-workflow-transition.service";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class RunAutomaticWorkflowTransitionsJob {
  private readonly logger = new Logger(RunAutomaticWorkflowTransitionsJob.name);

  constructor(
    @Inject(SALE_ORDER_REPOSITORY) private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly transitionService: SaleOrderWorkflowTransitionService,
  ) {}

  async run(input?: { limit?: number }) {
    const ids = await this.saleOrderRepo.listIdsForAutomaticWorkflow(input?.limit ?? 500);
    let updated = 0;
    let failed = 0;
    const saleOrderIds: string[] = [];

    for (const saleOrderId of ids) {
      try {
        const result = await this.uow.runInTransaction((tx) =>
          this.transitionService.advanceAutomatic(saleOrderId, SYSTEM_USER_ID, tx),
        );
        if (result) {
          updated += 1;
          saleOrderIds.push(saleOrderId);
        }
      } catch (error) {
        failed += 1;
        this.logger.warn(`automatic workflow failed saleOrderId=${saleOrderId}: ${(error as Error).message}`);
      }
    }

    return { found: ids.length, updated, failed, saleOrderIds };
  }
}
