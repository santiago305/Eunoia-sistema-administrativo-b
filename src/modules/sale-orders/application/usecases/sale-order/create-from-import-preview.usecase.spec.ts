import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_ORDER_ITEM_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SALE_ORDER_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_PAYMENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SaleOrderImportClientResolverService } from "src/modules/sale-orders/application/services/sale-order-import-client-resolver.service";
import { SaleOrderImportRowNormalizerService } from "src/modules/sale-orders/application/services/sale-order-import-row-normalizer.service";
import { SaleOrderImportSkuResolverService } from "src/modules/sale-orders/application/services/sale-order-import-sku-resolver.service";
import { SaleOrderImportSourceResolverService } from "src/modules/sale-orders/application/services/sale-order-import-source-resolver.service";
import { CreateFromImportPreviewUseCase } from "./create-from-import-preview.usecase";
import { WORKFLOW_REPOSITORY } from "src/modules/workflow/domain/ports/workflow.repository";
import { SaleOrderNumberingService } from "../../services/sale-order-numbering.service";

function makeImportUsecase(overrides: Record<string, any> = {}) {
  const tx = overrides.tx ?? {};
  const uow = { runInTransaction: (work: any) => work(tx) };
  const saleOrderRepo = { create: jest.fn().mockResolvedValue({ id: "order-1" }) };
  const saleOrderItemRepo = { bulkCreate: jest.fn().mockResolvedValue([{ id: "item-1" }]) };
  const componentRepo = { bulkCreate: jest.fn().mockResolvedValue([]) };
  const paymentRepo = { bulkCreate: jest.fn().mockResolvedValue([]) };
  const workflowRepo = { findActiveByNormalizedName: jest.fn().mockResolvedValue(null) };
  const numbering = { reserveNext: jest.fn().mockResolvedValue({ serie: "PE", correlative: 1 }) };
  const normalizer = { normalize: jest.fn() };
  const clientResolver = { resolveOrCreate: jest.fn().mockResolvedValue("client-1") };
  const sourceResolver = { resolveOrCreate: jest.fn().mockResolvedValue("source-1") };
  const skuResolver = {
    resolveOrCreateSkus: jest.fn().mockResolvedValue([
      {
        productId: "product-1",
        skuId: "sku-1",
        skuName: "Jabon Azufre",
        customSku: "EVA001",
        quantity: 1,
      },
    ]),
  };

  const usecase = new CreateFromImportPreviewUseCase(
    overrides.uow ?? (uow as any),
    overrides.saleOrderRepo ?? (saleOrderRepo as any),
    overrides.saleOrderItemRepo ?? (saleOrderItemRepo as any),
    overrides.componentRepo ?? (componentRepo as any),
    overrides.paymentRepo ?? (paymentRepo as any),
    overrides.normalizer ?? (normalizer as any),
    overrides.clientResolver ?? (clientResolver as any),
    overrides.sourceResolver ?? (sourceResolver as any),
    overrides.skuResolver ?? (skuResolver as any),
    overrides.workflowRepo ?? (workflowRepo as any),
    overrides.numbering ?? (numbering as any),
  );

  return {
    usecase,
    tx,
    saleOrderRepo,
    saleOrderItemRepo,
    componentRepo,
    paymentRepo,
    normalizer,
    clientResolver,
    sourceResolver,
    skuResolver,
    workflowRepo,
    numbering,
  };
}

describe("CreateFromImportPreviewUseCase", () => {
  it("imports a single valid row", async () => {
    const uow = { runInTransaction: (work: any) => work({}) };
    const saleOrderRepo = { create: jest.fn() };
    const saleOrderItemRepo = { bulkCreate: jest.fn() };
    const componentRepo = { bulkCreate: jest.fn() };
    const paymentRepo = { bulkCreate: jest.fn() };
    const workflowRepo = {
      findActiveByNormalizedName: jest.fn().mockResolvedValue({
        workflow: { id: "workflow-1" },
        initialState: { id: "state-1" },
      }),
    };
    const numbering = {
      reserveNext: jest.fn().mockResolvedValue({ serie: "PE", correlative: 7 }),
    };

    const normalizer = { normalize: jest.fn() };
    const clientResolver = { resolveOrCreate: jest.fn() };
    const sourceResolver = { resolveOrCreate: jest.fn() };
    const skuResolver = { resolveOrCreateSkus: jest.fn() };

    normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: "2026-05-20",
        workflowName: "ABONADO ENVIO",
        address: "Av",
        internalNote: "facebook",
        advertisingCode: "ABC1202438017105",
        total: 120,
        advance: 40,
        parsedSkus: [{ rawCode: "X", productName: "A", variantName: null, skuName: "A", customSku: "EVA001", quantity: 2 }],
        clientResolution: { clientId: null, matchedBy: null },
      },
    });

    clientResolver.resolveOrCreate.mockResolvedValue("client-1");
    sourceResolver.resolveOrCreate.mockResolvedValue("source-1");
    skuResolver.resolveOrCreateSkus.mockResolvedValue([{ productId: "p1", skuId: "s1", skuName: "A", customSku: "EVA001", quantity: 2 }]);

    saleOrderRepo.create.mockResolvedValue({ id: "order-1" });
    saleOrderItemRepo.bulkCreate.mockResolvedValue([{ id: "item-1" }]);
    componentRepo.bulkCreate.mockResolvedValue([{ id: "c-1" }]);
    paymentRepo.bulkCreate.mockResolvedValue([{ id: "pay-1" }]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateFromImportPreviewUseCase,
        { provide: UNIT_OF_WORK, useValue: uow },
        { provide: SALE_ORDER_REPOSITORY, useValue: saleOrderRepo },
        { provide: SALE_ORDER_ITEM_REPOSITORY, useValue: saleOrderItemRepo },
        { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useValue: componentRepo },
        { provide: SALE_PAYMENT_REPOSITORY, useValue: paymentRepo },
        { provide: SaleOrderImportRowNormalizerService, useValue: normalizer },
        { provide: SaleOrderImportClientResolverService, useValue: clientResolver },
        { provide: SaleOrderImportSourceResolverService, useValue: sourceResolver },
        { provide: SaleOrderImportSkuResolverService, useValue: skuResolver },
        { provide: WORKFLOW_REPOSITORY, useValue: workflowRepo },
        { provide: SaleOrderNumberingService, useValue: numbering },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateFromImportPreviewUseCase);

      const result = await usecase.execute({ rows: [{ total: 120 } as any], userId: "user-1" });
      expect(result.importedRows).toBe(1);
      expect(result.failedRows).toBe(0);
      expect(result.rows[0].saleOrderId).toBe("order-1");
      expect(saleOrderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: "workflow-1",
          currentStateId: "state-1",
          serie: "PE",
          correlative: 7,
          advertisingCode: "ABC1202438017105",
        }),
        expect.anything(),
      );
    } finally {
      await moduleRef.close();
    }
  });

  it("reports normalization errors", async () => {
    const normalizer = { normalize: jest.fn() };
    normalizer.normalize.mockResolvedValue({ ok: false, rowNumber: 2, errors: ["Numero de telefono es obligatorio"] });

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateFromImportPreviewUseCase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: SALE_ORDER_REPOSITORY, useValue: { create: jest.fn() } },
        { provide: SALE_ORDER_ITEM_REPOSITORY, useValue: { bulkCreate: jest.fn() } },
        { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useValue: { bulkCreate: jest.fn() } },
        { provide: SALE_PAYMENT_REPOSITORY, useValue: { bulkCreate: jest.fn() } },
        { provide: SaleOrderImportRowNormalizerService, useValue: normalizer },
        { provide: SaleOrderImportClientResolverService, useValue: { resolveOrCreate: jest.fn() } },
        { provide: SaleOrderImportSourceResolverService, useValue: { resolveOrCreate: jest.fn() } },
        { provide: SaleOrderImportSkuResolverService, useValue: { resolveOrCreateSkus: jest.fn() } },
        { provide: WORKFLOW_REPOSITORY, useValue: { findActiveByNormalizedName: jest.fn() } },
        {
          provide: SaleOrderNumberingService,
          useValue: { reserveNext: jest.fn() },
        },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateFromImportPreviewUseCase);
      const result = await usecase.execute({ rows: [{} as any], userId: "user-1" });
      expect(result.importedRows).toBe(0);
      expect(result.failedRows).toBe(1);
      expect(result.errors[0].rowNumber).toBe(2);
    } finally {
      await moduleRef.close();
    }
  });

  it("stores imported address on agencyDetail and does not change the client address", async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const tx = {
      manager: {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        }),
      },
    };
    const f = makeImportUsecase({ tx });
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: "2026-07-06",
        workflowName: null,
        address: "Av. Cliente 123",
        productName: "Pack Aloe",
        internalNote: null,
        advertisingCode: null,
        total: 120,
        advance: 0,
        deliveryCost: 0,
        couponCode: null,
        parsedSkus: [],
        clientResolution: { clientId: null, matchedBy: null },
      },
    });

    await f.usecase.execute({ rows: [{ total: 120 } as any], userId: "user-1" });

    expect(f.clientResolver.resolveOrCreate).toHaveBeenCalledWith(expect.objectContaining({ address: null }), tx);
    expect(f.saleOrderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agencySubsidiaryId: null,
        agencyDetail: "Av. Cliente 123",
      }),
      tx,
    );
    expect(tx.manager.getRepository).not.toHaveBeenCalled();
  });

  it("does not match import address against agency subsidiaries", async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: "subsidiary-1",
        address: "Av. Sucursal 456",
      }),
    };
    const tx = {
      manager: {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        }),
      },
    };
    const f = makeImportUsecase({ tx });
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: "2026-07-06",
        workflowName: null,
        address: "Sucursal Norte",
        productName: "Pack Aloe",
        internalNote: null,
        advertisingCode: null,
        total: 120,
        advance: 0,
        deliveryCost: 0,
        couponCode: null,
        parsedSkus: [],
        clientResolution: { clientId: null, matchedBy: null },
      },
    });

    await f.usecase.execute({ rows: [{ total: 120 } as any], userId: "user-1" });

    expect(f.clientResolver.resolveOrCreate).toHaveBeenCalledWith(expect.objectContaining({ address: null }), tx);
    expect(f.saleOrderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agencySubsidiaryId: null,
        agencyDetail: "Sucursal Norte",
      }),
      tx,
    );
    expect(tx.manager.getRepository).not.toHaveBeenCalled();
  });

  it("uses the imported pack name as the sale order item description", async () => {
    const f = makeImportUsecase();
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: "2026-07-06",
        workflowName: null,
        address: null,
        productName: "Pack Aloe",
        internalNote: null,
        advertisingCode: null,
        total: 120,
        advance: 0,
        deliveryCost: 0,
        couponCode: "COUPON-IGNORED-AS-DESCRIPTION",
        parsedSkus: [],
        clientResolution: { clientId: null, matchedBy: null },
      },
    });

    await f.usecase.execute({ rows: [{ total: 120 } as any], userId: "user-1" });

    expect(f.saleOrderItemRepo.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          description: "Pack Aloe",
        }),
      ],
      expect.anything(),
    );
  });

  it("uses Sin nombre when the imported pack name is empty", async () => {
    const f = makeImportUsecase();
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: "2026-07-06",
        workflowName: null,
        address: null,
        productName: null,
        internalNote: null,
        advertisingCode: null,
        total: 120,
        advance: 0,
        deliveryCost: 0,
        couponCode: null,
        parsedSkus: [],
        clientResolution: { clientId: null, matchedBy: null },
      },
    });

    await f.usecase.execute({ rows: [{ total: 120 } as any], userId: "user-1" });

    expect(f.saleOrderItemRepo.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          description: "Sin nombre",
        }),
      ],
      expect.anything(),
    );
  });

  it("uses the imported order date as the sale order creation date", async () => {
    const f = makeImportUsecase();
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: "2026-07-06",
        orderDate: "2026-07-04",
        workflowName: null,
        address: null,
        productName: "Pack Aloe",
        internalNote: null,
        advertisingCode: null,
        total: 120,
        advance: 0,
        deliveryCost: 0,
        couponCode: null,
        parsedSkus: [],
        clientResolution: { clientId: null, matchedBy: null },
      },
    });

    await f.usecase.execute({ rows: [{ total: 120 } as any], userId: "user-1" });

    expect(f.saleOrderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleDate: "2026-07-04",
        createdAt: new Date("2026-07-04T00:00:00.000Z"),
      }),
      expect.anything(),
    );
  });
});

