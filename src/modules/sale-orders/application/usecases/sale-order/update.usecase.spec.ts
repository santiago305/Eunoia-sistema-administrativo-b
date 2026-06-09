import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { PACK_REPOSITORY } from "src/modules/packs/domain/ports/pack.repository";
import { SALE_ORDER_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_ITEM_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_PAYMENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { UpdateSaleOrderUsecase } from "./update.usecase";

describe("UpdateSaleOrderUsecase", () => {
  it("replaces order lines without mutating inventory", async () => {
    const componentRepo = {
      deleteBySaleOrderItemIds: jest.fn(),
      bulkCreate: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateSaleOrderUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: PACK_REPOSITORY, useValue: { findByIdWithItems: jest.fn() } },
        {
          provide: SALE_ORDER_REPOSITORY,
          useValue: {
            findByIdForUpdate: jest.fn().mockResolvedValue({ id: "order-1" }),
            update: jest.fn().mockResolvedValue({
              id: "order-1",
              serie: "PED",
              correlative: 1,
              workflowId: "workflow-1",
              currentStateId: "state-1",
            }),
          },
        },
        {
          provide: SALE_ORDER_ITEM_REPOSITORY,
          useValue: {
            listBySaleOrderId: jest.fn().mockResolvedValue([{ id: "old-item" }]),
            deleteBySaleOrderId: jest.fn(),
            bulkCreate: jest.fn().mockResolvedValue([{ id: "new-item" }]),
          },
        },
        { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useValue: componentRepo },
        { provide: SALE_PAYMENT_REPOSITORY, useValue: { deleteBySaleOrderId: jest.fn(), bulkCreate: jest.fn() } },
      ],
    }).compile();

    await moduleRef.get(UpdateSaleOrderUsecase).execute({
      saleOrderId: "order-1",
      warehouseId: "warehouse-1",
      clientId: "client-1",
      items: [{
        quantity: 1,
        unitPrice: 10,
        total: 10,
        components: [{ skuId: "sku-1", quantity: 1, unitPrice: 10, total: 10 }],
      }],
    });

    expect(componentRepo.bulkCreate).toHaveBeenCalled();
    await moduleRef.close();
  });
});
