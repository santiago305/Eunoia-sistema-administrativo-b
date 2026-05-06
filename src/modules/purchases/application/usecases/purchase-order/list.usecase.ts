import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { ParseDateLocal } from "src/shared/utilidades/utils/ParseDates";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PURCHASE_SEARCH, PurchaseSearchRepository } from "src/modules/purchases/domain/ports/purchase-search.repository";
import { ListPurchaseOrdersInput } from "../../dtos/purchase-order/input/list.input";
import { PurchaseOrderOutput } from "../../dtos/purchase-order/output/purchase-order.output";
import { PurchaseOrderOutputMapper } from "../../mappers/purchase-order-output.mapper";
import {
  hasPurchaseSearchCriteria,
  sanitizePurchaseSearchSnapshot,
} from "../../support/purchase-search.utils";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";

const PURCHASE_SEARCH_TABLE_KEY = "purchase-orders";

export class ListPurchaseOrdersUsecase {
  constructor(
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PURCHASE_SEARCH)
    private readonly purchaseSearchRepo: PurchaseSearchRepository,
    private readonly accessControlService: AccessControlService,
  ) {}

  async execute(input: ListPurchaseOrdersInput): Promise<PaginatedResult<PurchaseOrderOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const snapshot = sanitizePurchaseSearchSnapshot({
      q: input.q,
      filters: input.filters ?? [],
    });

    const requestedBy = input.requestedBy;
    const canViewAll = requestedBy
      ? await this.accessControlService.userHasAllPermissions(requestedBy, ["purchases.view_all"])
      : false;
    const canViewCreatedByOthers = requestedBy
      ? await this.accessControlService.userHasAllPermissions(requestedBy, ["purchases.view_created_by_others"])
      : false;
    const canViewCreatorInfo = requestedBy
      ? await this.accessControlService.userHasAllPermissions(requestedBy, ["purchases.view_creator_info"])
      : false;

    const { items, total } = await this.purchaseRepo.list({
      filters: input.filters,
      q: input.q,
      from: input.from ? ParseDateLocal(input.from, "start") : undefined,
      to: input.to ? ParseDateLocal(input.to, "end") : undefined,
      page,
      limit,
      requestedBy,
      canViewCreatedByOthers,
      canViewAll,
      purchaseIdsWhitelist: input.purchaseIdsWhitelist,
    });

    if (input.requestedBy && hasPurchaseSearchCriteria(snapshot)) {
      await this.purchaseSearchRepo.touchRecentSearch({
        userId: input.requestedBy,
        tableKey: PURCHASE_SEARCH_TABLE_KEY,
        snapshot,
      });
    }

    const itemsWithPayments = items.map((row) => {
        const mappedOrder = PurchaseOrderOutputMapper.toOrderOutput(row.order, {
          supplierName: row.supplierName,
          supplierDocumentNumber: row.supplierDocumentNumber,
          warehouseName: row.warehouseName,
        });

        return {
          ...mappedOrder,
          totalPaid: row.totalPaid,
          totalToPay: (mappedOrder.total ?? 0) - row.totalPaid,
          createdByUserId: canViewCreatorInfo ? row.createdByUserId : undefined,
          approvalStatus: row.approvalStatus ?? "NOT_REQUIRED",
          processingApprovalStatus: row.processingApprovalStatus ?? null,
        };
      });

    return {
      items: itemsWithPayments,
      total,
      page,
      limit,
    };
  }
}
