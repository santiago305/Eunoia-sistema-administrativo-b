import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { ParseDateLocal } from "src/shared/utilidades/utils/ParseDates";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PURCHASE_SEARCH, PurchaseSearchRepository } from "src/modules/purchases/domain/ports/purchase-search.repository";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { ListPurchaseOrdersInput } from "../../dtos/purchase-order/input/list.input";
import { PurchaseOrderOutput } from "../../dtos/purchase-order/output/purchase-order.output";
import { PurchaseOrderOutputMapper } from "../../mappers/purchase-order-output.mapper";
import {
  hasPurchaseSearchCriteria,
  sanitizePurchaseSearchSnapshot,
} from "../../support/purchase-search.utils";

const PURCHASE_SEARCH_TABLE_KEY = "purchase-orders";

export class ListPurchaseOrdersUsecase {
  constructor(
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
    @Inject(PURCHASE_SEARCH)
    private readonly purchaseSearchRepo: PurchaseSearchRepository,
  ) {}

  async execute(input: ListPurchaseOrdersInput): Promise<PaginatedResult<PurchaseOrderOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const snapshot = sanitizePurchaseSearchSnapshot({
      q: input.q,
      filters: {
        supplierIds: input.supplierIds ?? [],
        warehouseIds: input.warehouseIds ?? [],
        statuses: input.statuses ?? [],
        documentTypes: input.documentTypes ?? [],
        paymentForms: input.paymentForms ?? [],
      },
    });

    const { items, total } = await this.purchaseRepo.list({
      statuses: input.statuses,
      supplierIds: input.supplierIds,
      warehouseIds: input.warehouseIds,
      documentTypes: input.documentTypes,
      paymentForms: input.paymentForms,
      number: input.number,
      q: input.q,
      from: input.from ? ParseDateLocal(input.from, "start") : undefined,
      to: input.to ? ParseDateLocal(input.to, "end") : undefined,
      page,
      limit,
    });

    if (input.requestedBy && hasPurchaseSearchCriteria(snapshot)) {
      await this.purchaseSearchRepo.touchRecentSearch({
        userId: input.requestedBy,
        tableKey: PURCHASE_SEARCH_TABLE_KEY,
        snapshot,
      });
    }

    const itemsWithPayments = await Promise.all(
      items.map(async (row) => {
        const payments = await this.paymentDocRepo.findByPoId(row.order.poId);
        const paymentOutputs = payments.map((payment) =>
          PurchaseOrderOutputMapper.toPaymentOutput(payment),
        );

        const totalPaid = paymentOutputs.reduce((sum, p) => sum + (p.amount ?? 0), 0);
        const mappedOrder = PurchaseOrderOutputMapper.toOrderOutput(row.order, {
          supplierName: row.supplierName,
          supplierDocumentNumber: row.supplierDocumentNumber,
          warehouseName: row.warehouseName,
        });

        return {
          ...mappedOrder,
          totalPaid,
          totalToPay: (mappedOrder.total ?? 0) - totalPaid,
        };
      }),
    );

    return {
      items: itemsWithPayments,
      total,
      page,
      limit,
    };
  }
}
