import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import {
  WAREHOUSE_REPOSITORY,
  WarehouseRepository,
} from "src/modules/warehouses/application/ports/warehouse.repository.port";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { WorkflowActionType } from "../../domain/constants/workflow-action.constants";

export type AssignWarehouseByProvinceConfig = {
  mode: "INCLUDE" | "EXCLUDE";
  provinceIds: string[];
  warehouseId: string;
};

export type WorkflowActionOutcome = {
  actionType: WorkflowActionType;
  status: "APPLIED" | "SKIPPED";
  message?: string;
};

export type WarehouseAssignmentResult = {
  order: SaleOrder;
  outcome: WorkflowActionOutcome;
};

const ACTION_TYPE = "ASSIGN_WAREHOUSE_BY_PROVINCE" as const;
const EXISTING_WAREHOUSE_MESSAGE = "Ya hay un almacén seleccionado";

@Injectable()
export class SaleOrderWarehouseAssignmentService {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
  ) {}

  async assign(
    order: SaleOrder,
    config: AssignWarehouseByProvinceConfig,
    tx: TransactionContext,
  ): Promise<WarehouseAssignmentResult> {
    if (order.warehouseId) {
      return this.skipped(order, EXISTING_WAREHOUSE_MESSAGE);
    }

    const client = await this.clientRepo.findById(order.clientId, tx);
    const provinceId =
      typeof client?.provinceId === "string"
        ? client.provinceId
        : client?.provinceId?.value ?? null;
    if (!provinceId) {
      return this.skipped(order);
    }

    const isListed = config.provinceIds.includes(provinceId);
    const matches = config.mode === "INCLUDE" ? isListed : !isListed;
    if (!matches) {
      return this.skipped(order);
    }

    const warehouse = await this.warehouseRepo.findById(new WarehouseId(config.warehouseId), tx);
    if (!warehouse?.isActive) {
      throw new BadRequestException("El almacen configurado no existe o esta inactivo");
    }

    const assignedOrder = await this.saleOrderRepo.assignWarehouseIfEmpty(
      { saleOrderId: order.id, warehouseId: config.warehouseId },
      tx,
    );
    if (!assignedOrder) {
      return this.skipped(order, EXISTING_WAREHOUSE_MESSAGE);
    }

    return {
      order: assignedOrder,
      outcome: { actionType: ACTION_TYPE, status: "APPLIED" },
    };
  }

  private skipped(order: SaleOrder, message?: string): WarehouseAssignmentResult {
    return {
      order,
      outcome: {
        actionType: ACTION_TYPE,
        status: "SKIPPED",
        ...(message ? { message } : {}),
      },
    };
  }
}
