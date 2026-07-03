import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { SaleOrderWorkflowTransitionService } from "src/modules/workflow/application/services/sale-order-workflow-transition.service";
import { TRANSITION_PURPOSES } from "src/modules/workflow/domain/constants/workflow-transition-purpose.constants";

@Injectable()
export class CancelSaleOrderUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
    private readonly workflowTransitionService: SaleOrderWorkflowTransitionService,
  ) {}

  async execute(input: { saleOrderId: string }) {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
      if (!order) throw new BadRequestException("Pedido no encontrado");

      const updated = await this.workflowTransitionService.advance(
        {
          saleOrderId: order.id,
          executedBy: order.createdBy,
          transitionPurpose: TRANSITION_PURPOSES.CANCEL,
          metadata: { source: "cancel.usecase" },
        },
        tx,
      );
      const deliveredOrdersCount = await this.saleOrderRepo.countSaleOrdersByClientId(order.clientId, tx);
      const type =
        deliveredOrdersCount === 0
          ? ClientType.LAGGING
          : deliveredOrdersCount === 1
            ? ClientType.NEW
            : ClientType.REPURCHASE;
      await this.clientRepo.update({ clientId: order.clientId, type }, tx);

      return { saleOrderId: order.id, currentStateId: updated.order.currentStateId };
    });
  }
}

