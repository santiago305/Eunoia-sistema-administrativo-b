import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { PACK_REPOSITORY } from "src/modules/packs/domain/ports/pack.repository";
import { SALE_ORDER_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_ITEM_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_PAYMENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { WORKFLOW_REPOSITORY } from "src/modules/workflow/domain/ports/workflow.repository";
import { WORKFLOW_STATE_REPOSITORY } from "src/modules/workflow/domain/ports/workflow-state.repository";
import { CreateSaleOrderUsecase } from "./create.usecase";
import { SaleOrderNumberingService } from "../../services/sale-order-numbering.service";

describe("CreateSaleOrderUsecase", () => {
  it("persists components without reserving stock", async () => {
    const componentRepo = { bulkCreate: jest.fn().mockResolvedValue([]) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateSaleOrderUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: PACK_REPOSITORY, useValue: { findByIdWithItems: jest.fn() } },
        { provide: SaleOrderNumberingService, useValue: { reserveNext: jest.fn().mockResolvedValue({ serie: "PE", correlative: 7 }) } },
        {
          provide: SALE_ORDER_REPOSITORY,
          useValue: {
            create: jest.fn().mockResolvedValue({
              id: "order-1",
              serie: "PE",
              correlative: 7,
              workflowId: "workflow-1",
              currentStateId: "state-1",
            }),
          },
        },
        {
          provide: SALE_ORDER_ITEM_REPOSITORY,
          useValue: { bulkCreate: jest.fn().mockResolvedValue([{ id: "item-1" }]) },
        },
        { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useValue: componentRepo },
        { provide: SALE_PAYMENT_REPOSITORY, useValue: { bulkCreate: jest.fn() } },
        { provide: WORKFLOW_REPOSITORY, useValue: { findById: jest.fn().mockResolvedValue({ id: "workflow-1", isActive: true }) } },
        { provide: WORKFLOW_STATE_REPOSITORY, useValue: { findInitialByWorkflowId: jest.fn().mockResolvedValue({ id: "state-1" }) } },
      ],
    }).compile();

    await moduleRef.get(CreateSaleOrderUsecase).execute(
      {
        warehouseId: "warehouse-1",
        clientId: "client-1",
        workflowId: "workflow-1",
        items: [{
          quantity: 1,
          unitPrice: 10,
          total: 10,
          components: [{ skuId: "sku-1", quantity: 1, unitPrice: 10, total: 10 }],
        }],
      },
      "user-1",
    );

    expect(componentRepo.bulkCreate).toHaveBeenCalled();
    await moduleRef.close();
  });
});
