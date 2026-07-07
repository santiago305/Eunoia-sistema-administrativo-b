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
    const tx = { id: 'create-tx' };
    const componentRepo = { bulkCreate: jest.fn().mockResolvedValue([]) };
    const saleOrderRepo = {
      create: jest.fn().mockResolvedValue({
        id: "order-1",
        serie: "PE",
        correlative: 7,
        workflowId: "workflow-1",
        currentStateId: "state-1",
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateSaleOrderUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work(tx) } },
        { provide: PACK_REPOSITORY, useValue: { findByIdWithItems: jest.fn() } },
        { provide: SaleOrderNumberingService, useValue: { reserveNext: jest.fn().mockResolvedValue({ serie: "PE", correlative: 7 }) } },
        {
          provide: SALE_ORDER_REPOSITORY,
          useValue: saleOrderRepo,
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
        deliveryCost: 5,
        discount: 3,
        subTotal: 999,
        total: 999,
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
    expect(saleOrderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subTotal: 10,
        deliveryCost: 5,
        discount: 3,
        total: 12,
      }),
      tx,
    );
    await moduleRef.close();
  });

  it("allows extra components that do not belong to the selected pack", async () => {
    const tx = { id: 'create-tx' };
    const componentRepo = { bulkCreate: jest.fn().mockResolvedValue([]) };
    const packRepo = {
      findByIdWithItems: jest.fn().mockResolvedValue({
        id: "pack-1",
        items: [
          {
            id: "pack-item-1",
            skuId: "sku-pack",
            quantity: 1,
            price: 10,
            lineTotal: 10,
          },
        ],
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateSaleOrderUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work(tx) } },
        { provide: PACK_REPOSITORY, useValue: packRepo },
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
          useValue: { bulkCreate: jest.fn().mockResolvedValue([{ id: "item-1", quantity: 1 }]) },
        },
        { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useValue: componentRepo },
        { provide: SALE_PAYMENT_REPOSITORY, useValue: { bulkCreate: jest.fn() } },
        { provide: WORKFLOW_REPOSITORY, useValue: { findById: jest.fn().mockResolvedValue({ id: "workflow-1", isActive: true }) } },
        { provide: WORKFLOW_STATE_REPOSITORY, useValue: { findInitialByWorkflowId: jest.fn().mockResolvedValue({ id: "state-1" }) } },
      ],
    }).compile();

    await expect(moduleRef.get(CreateSaleOrderUsecase).execute(
      {
        warehouseId: "warehouse-1",
        clientId: "client-1",
        workflowId: "workflow-1",
        items: [{
          quantity: 1,
          unitPrice: 30,
          total: 30,
          referencePackId: "pack-1",
          components: [
            { skuId: "sku-pack", quantity: 1, unitPrice: 10, total: 10 },
            { skuId: "sku-extra", quantity: 1, unitPrice: 20, total: 20 },
          ],
        }],
      },
      "user-1",
    )).resolves.toEqual(expect.objectContaining({ orderId: "order-1" }));

    expect(componentRepo.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          skuId: "sku-pack",
          referencePackItemId: "pack-item-1",
        }),
        expect.objectContaining({
          skuId: "sku-extra",
          referencePackItemId: null,
          quantity: 1,
          unitPrice: 20,
          total: 20,
        }),
      ]),
      tx,
    );
    await moduleRef.close();
  });
});
