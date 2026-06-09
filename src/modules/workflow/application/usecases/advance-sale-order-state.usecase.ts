import { Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SaleOrderWorkflowTransitionService } from "../services/sale-order-workflow-transition.service";

@Injectable()
export class AdvanceSaleOrderStateUseCase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    private readonly transitionService: SaleOrderWorkflowTransitionService,
  ) {}

  async execute(input: {
    saleOrderId: string;
    executedBy: string;
    transitionId?: string;
    transitionCode?: string;
    metadata?: Record<string, unknown> | null;
  }) {
    return this.uow.runInTransaction((tx) => this.transitionService.advance(input, tx));
  }
}
