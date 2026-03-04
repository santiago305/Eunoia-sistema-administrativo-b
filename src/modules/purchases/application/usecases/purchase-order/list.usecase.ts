import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { ParseDateLocal } from "src/shared/utilidades/utils/ParseDates";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { ListPurchaseOrdersInput } from "../../dtos/purchase-order/input/list.input";
import { PurchaseOrderOutput } from "../../dtos/purchase-order/output/purchase-order.output";

export class ListPurchaseOrdersUsecase {
  constructor(
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
  ) {}

  async execute(input: ListPurchaseOrdersInput): Promise<PaginatedResult<PurchaseOrderOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.purchaseRepo.list({
      status: input.status,
      supplierId: input.supplierId,
      warehouseId: input.warehouseId,
      documentType: input.documentType,
      serie: input.serie,
      correlative: input.correlative,
      from: input.from ? ParseDateLocal(input.from, "start") : undefined,
      to: input.to ? ParseDateLocal(input.to, "end") : undefined,
      page,
      limit,
    });

    return {
      items: items.map((row) => ({
        poId: row.poId,
        supplierId: row.supplierId,
        warehouseId: row.warehouseId,
        documentType: row.documentType,
        serie: row.serie,
        correlative: row.correlative,
        currency: row.currency,
        paymentForm: row.paymentForm,
        creditDays: row.creditDays,
        numQuotas: row.numQuotas,
        totalTaxed: row.totalTaxed.getAmount(),
        totalExempted: row.totalExempted.getAmount(),
        totalIgv: row.totalIgv.getAmount(),
        purchaseValue: row.purchaseValue.getAmount(),
        total: row.total.getAmount(),
        note: row.note,
        status: row.status,
        isActive: row.isActive,
        expectedAt: row.expectedAt,
        dateIssue: row.dateIssue,
        dateExpiration: row.dateExpiration,
        createdAt: row.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}
