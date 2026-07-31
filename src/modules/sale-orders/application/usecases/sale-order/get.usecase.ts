import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { SaleOrderGetOutput } from "../../dtos/sale-order-search/output/sale-order-search-state.output";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SaleOrderEditPolicyService } from "../../services/sale-order-edit-policy.service";
import { SaleOrderAccessPolicyService } from "../../services/sale-order-access-policy.service";


@Injectable()
export class GetSaleOrderUsecase {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderQueryRepo: SaleOrderRepository,
    private readonly editPolicy: SaleOrderEditPolicyService,
    private readonly accessPolicy?: SaleOrderAccessPolicyService,
  ) {}

  async execute(input: { saleOrderId: string; requestedBy?: string }): Promise<SaleOrderGetOutput> {
    const readContext = input.requestedBy && this.accessPolicy
      ? await this.accessPolicy.resolveReadContext(input.requestedBy)
      : undefined;
    const order = await this.saleOrderQueryRepo.findById(input.saleOrderId, readContext);
    if (!order) {
      throw new BadRequestException("Pedido no encontrado");
    }
    const editPolicy = await this.editPolicy.resolve({
      id: order.id,
      workflowId: order.workflow?.id ?? null,
      currentStateId: order.currentState?.id ?? null,
      reserveBool: order.reserveBool,
    });
    return { ...order, editPolicy };
  }
}
