import { Inject, Injectable } from "@nestjs/common";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SaleOrderAuditOutput } from "../../dtos/sale-order-audit.output";

@Injectable()
export class ListSaleOrderAuditUsecase {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
  ) {}

  async execute(saleOrderId: string): Promise<SaleOrderAuditOutput[]> {
    const rows = await this.saleOrderRepo.listAudit(saleOrderId);
    return rows.map((row) => ({
      id: row.id,
      saleOrderId: row.saleOrderId,
      createdAt: row.createdAt.toISOString(),
      executedBy: { id: row.executedBy, name: row.executedByName, email: row.executedByEmail },
      actionExecution: row.actionExecution,
    }));
  }
}
