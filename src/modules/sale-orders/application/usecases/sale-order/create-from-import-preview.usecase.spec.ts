import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UNIT_OF_WORK } from 'src/shared/domain/ports/unit-of-work.port';
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY } from 'src/modules/sale-orders/domain/ports/sale-order-item-component.repository';
import { SALE_ORDER_ITEM_REPOSITORY } from 'src/modules/sale-orders/domain/ports/sale-order-item.repository';
import { SALE_ORDER_REPOSITORY } from 'src/modules/sale-orders/domain/ports/sale-order.repository';
import { SALE_PAYMENT_REPOSITORY } from 'src/modules/sale-orders/domain/ports/sale-payment.repository';
import { SaleOrderImportClientResolverService } from 'src/modules/sale-orders/application/services/sale-order-import-client-resolver.service';
import { SaleOrderImportRowNormalizerService } from 'src/modules/sale-orders/application/services/sale-order-import-row-normalizer.service';
import { SaleOrderImportSkuResolverService } from 'src/modules/sale-orders/application/services/sale-order-import-sku-resolver.service';
import { SaleOrderImportSourceResolverService } from 'src/modules/sale-orders/application/services/sale-order-import-source-resolver.service';
import { CreateFromImportPreviewUseCase } from './create-from-import-preview.usecase';
import { WORKFLOW_REPOSITORY } from 'src/modules/workflow/domain/ports/workflow.repository';
import { SaleOrderNumberingService } from '../../services/sale-order-numbering.service';
import { AssignImportLoteUsecase } from './assign-import-lote.usecase';
import { SaleOrderSuppliesService } from '../../services/sale-order-supplies.service';
import { SaleOrderPackMatcherService } from '../../services/sale-order-pack-matcher.service';

function makeImportUsecase(overrides: Record<string, any> = {}) {
  const tx = overrides.tx ?? {};
  const uow = { runInTransaction: (work: any) => work(tx) };
  const saleOrderRepo = {
    create: jest.fn().mockResolvedValue({ id: 'order-1' }),
  };
  const saleOrderItemRepo = {
    bulkCreate: jest.fn().mockResolvedValue([{ id: 'item-1' }]),
  };
  const componentRepo = { bulkCreate: jest.fn().mockResolvedValue([]) };
  const paymentRepo = { bulkCreate: jest.fn().mockResolvedValue([]) };
  const workflowRepo = {
    findActiveByNormalizedName: jest.fn().mockResolvedValue(null),
  };
  const numbering = {
    reserveNext: jest.fn().mockResolvedValue({ serie: 'PE', correlative: 1 }),
  };
  const assignImportLote = {
    execute: jest.fn().mockResolvedValue({ id: 'lote-1', lote: 1 }),
  };
  const packMatcher = {
    decompose: jest.fn().mockResolvedValue({
      status: 'NONE',
      composition: [],
      matches: [],
    }),
  };
  const normalizer = { normalize: jest.fn() };
  const clientResolver = {
    resolveOrCreate: jest.fn().mockResolvedValue('client-1'),
  };
  const sourceResolver = {
    resolveOrCreate: jest.fn().mockResolvedValue('source-1'),
  };
  const adviserResolver = { resolveByName: jest.fn().mockResolvedValue(null) };
  const suppliesService = {
    copyFromWorkflowRecipe: jest.fn().mockResolvedValue([]),
  };
  const skuResolver = {
    resolveOrCreateSkus: jest.fn().mockResolvedValue([
      {
        productId: 'product-1',
        skuId: 'sku-1',
        skuName: 'Jabon Azufre',
        customSku: 'EVA001',
        quantity: 1,
      },
    ]),
  };

  const usecase = new (CreateFromImportPreviewUseCase as any)(
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
    overrides.assignImportLote ?? (assignImportLote as any),
    overrides.packMatcher ?? (packMatcher as any),
    overrides.adviserResolver ?? (adviserResolver as any),
    overrides.suppliesService ?? (suppliesService as any),
  ) as CreateFromImportPreviewUseCase;

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
    assignImportLote,
    packMatcher,
    adviserResolver,
    suppliesService,
  };
}

function makeNormalizedImportRow(overrides: Record<string, any> = {}) {
  return {
    deliveryDate: '2026-08-20',
    orderDate: '2026-08-18',
    workflowName: null,
    address: null,
    productName: 'Presentacion importada',
    internalNote: null,
    advertisingCode: null,
    total: 100,
    advance: 0,
    deliveryCost: 0,
    couponCode: null,
    confirmedBy: null,
    parsedSkus: [],
    clientResolution: { clientId: null, matchedBy: null },
    ...overrides,
  };
}

describe('CreateFromImportPreviewUseCase', () => {
  it('rejects the complete dispatch before creating orders when any SKU is unknown', async () => {
    const runInTransaction = jest.fn();
    const f = makeImportUsecase({
      uow: { runInTransaction },
      skuResolver: {
        resolveOrCreateSkus: jest
          .fn()
          .mockRejectedValue(
            new BadRequestException(
              'El SKU personalizado EVA999 no existe en el catalogo',
            ),
          ),
      },
    });
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        parsedSkus: [
          {
            rawCode: 'PRODUCTO-EVA999',
            productName: 'PRODUCTO',
            variantName: null,
            skuName: 'PRODUCTO',
            customSku: 'EVA999',
            quantity: 1,
          },
        ],
      },
    });

    await expect(
      f.usecase.execute({
        rows: [{ productCodes: 'PRODUCTO-EVA999' }],
        userId: 'user-1',
      }),
    ).rejects.toThrow(
      'No se puede importar el despacho porque existen productos no registrados',
    );
    expect(runInTransaction).not.toHaveBeenCalled();
  });

  it('imports a single valid row', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-30T01:30:00.000Z'));
    const uow = { runInTransaction: (work: any) => work({}) };
    const saleOrderRepo = { create: jest.fn() };
    const saleOrderItemRepo = { bulkCreate: jest.fn() };
    const componentRepo = { bulkCreate: jest.fn() };
    const paymentRepo = { bulkCreate: jest.fn() };
    const workflowRepo = {
      findActiveByNormalizedName: jest.fn().mockResolvedValue({
        workflow: { id: 'workflow-1' },
        initialState: { id: 'state-1' },
      }),
    };
    const numbering = {
      reserveNext: jest.fn().mockResolvedValue({ serie: 'PE', correlative: 7 }),
    };
    const assignImportLote = {
      execute: jest.fn().mockResolvedValue({ id: 'lote-1', lote: 1 }),
    };
    const packMatcher = { decompose: jest.fn() };

    const normalizer = { normalize: jest.fn() };
    const clientResolver = { resolveOrCreate: jest.fn() };
    const sourceResolver = { resolveOrCreate: jest.fn() };
    const skuResolver = { resolveOrCreateSkus: jest.fn() };
    const suppliesService = {
      copyFromWorkflowRecipe: jest.fn().mockResolvedValue([]),
    };

    normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: '2026-05-20',
        workflowName: 'ABONADO ENVIO',
        address: 'Av',
        internalNote: 'facebook',
        advertisingCode: 'ABC1202438017105',
        total: 120,
        advance: 40,
        parsedSkus: [
          {
            rawCode: 'X',
            productName: 'A',
            variantName: null,
            skuName: 'A',
            customSku: 'EVA001',
            quantity: 2,
          },
        ],
        clientResolution: { clientId: null, matchedBy: null },
      },
    });

    clientResolver.resolveOrCreate.mockResolvedValue('client-1');
    sourceResolver.resolveOrCreate.mockResolvedValue('source-1');
    skuResolver.resolveOrCreateSkus.mockResolvedValue([
      {
        productId: 'p1',
        skuId: 's1',
        skuName: 'A',
        customSku: 'EVA001',
        quantity: 2,
      },
    ]);

    saleOrderRepo.create.mockResolvedValue({ id: 'order-1' });
    saleOrderItemRepo.bulkCreate.mockResolvedValue([{ id: 'item-1' }]);
    componentRepo.bulkCreate.mockResolvedValue([{ id: 'c-1' }]);
    paymentRepo.bulkCreate.mockResolvedValue([{ id: 'pay-1' }]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateFromImportPreviewUseCase,
        { provide: UNIT_OF_WORK, useValue: uow },
        { provide: SALE_ORDER_REPOSITORY, useValue: saleOrderRepo },
        { provide: SALE_ORDER_ITEM_REPOSITORY, useValue: saleOrderItemRepo },
        {
          provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
          useValue: componentRepo,
        },
        { provide: SALE_PAYMENT_REPOSITORY, useValue: paymentRepo },
        { provide: SaleOrderImportRowNormalizerService, useValue: normalizer },
        {
          provide: SaleOrderImportClientResolverService,
          useValue: clientResolver,
        },
        {
          provide: SaleOrderImportSourceResolverService,
          useValue: sourceResolver,
        },
        { provide: SaleOrderImportSkuResolverService, useValue: skuResolver },
        { provide: WORKFLOW_REPOSITORY, useValue: workflowRepo },
        { provide: SaleOrderNumberingService, useValue: numbering },
        { provide: AssignImportLoteUsecase, useValue: assignImportLote },
        { provide: SaleOrderPackMatcherService, useValue: packMatcher },
        { provide: SaleOrderSuppliesService, useValue: suppliesService },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateFromImportPreviewUseCase);

      const result = await usecase.execute({
        rows: [{ total: 120 } as any],
        userId: 'user-1',
      });
      expect(result.importedRows).toBe(1);
      expect(result.failedRows).toBe(0);
      expect(result.rows[0].saleOrderId).toBe('order-1');
      expect(saleOrderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'workflow-1',
          currentStateId: 'state-1',
          serie: 'PE',
          correlative: 7,
          advertisingCode: 'ABC1202438017105',
        }),
        expect.anything(),
      );
      expect(suppliesService.copyFromWorkflowRecipe).toHaveBeenCalledWith(
        'order-1',
        'workflow-1',
        expect.anything(),
      );
      expect(paymentRepo.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            saleOrderId: 'order-1',
            date: new Date('2026-08-29T00:00:00.000Z'),
            amount: 40,
          }),
        ],
        expect.anything(),
      );
    } finally {
      jest.useRealTimers();
      await moduleRef.close();
    }
  });

  it('copies an independent workflow recipe for every imported order', async () => {
    const f = makeImportUsecase();
    f.normalizer.normalize.mockImplementation(async (row: any) => ({
      ok: true,
      row: {
        deliveryDate: null,
        orderDate: null,
        workflowName: row.workflowName,
        address: null,
        productName: 'Pack',
        internalNote: null,
        advertisingCode: null,
        total: 100,
        advance: 0,
        parsedSkus: [
          {
            rawCode: 'X',
            productName: 'A',
            variantName: null,
            skuName: 'A',
            customSku: 'EVA001',
            quantity: 1,
          },
        ],
      },
    }));
    f.saleOrderRepo.create
      .mockResolvedValueOnce({ id: 'order-envio' })
      .mockResolvedValueOnce({ id: 'order-ce' });
    f.workflowRepo.findActiveByNormalizedName.mockImplementation(
      async (name: string) => ({
        workflow: {
          id: name === 'ABONO CE' ? 'workflow-ce' : 'workflow-envio',
        },
        initialState: { id: name === 'ABONO CE' ? 'state-ce' : 'state-envio' },
      }),
    );

    const result = await f.usecase.execute({
      rows: [
        { workflowName: 'ABONO ENVIO' },
        { workflowName: 'ABONO CE' },
      ] as any,
      userId: 'user-1',
    });

    expect(result.importedRows).toBe(2);
    expect(f.suppliesService.copyFromWorkflowRecipe).toHaveBeenNthCalledWith(
      1,
      'order-envio',
      'workflow-envio',
      f.tx,
    );
    expect(f.suppliesService.copyFromWorkflowRecipe).toHaveBeenNthCalledWith(
      2,
      'order-ce',
      'workflow-ce',
      f.tx,
    );
  });

  it('stores one distinct SKU as an independent product', async () => {
    const skuResolver = {
      resolveOrCreateSkus: jest.fn().mockResolvedValue([
        {
          productId: 'product-1',
          skuId: 'sku-1',
          skuName: 'Producto A',
          customSku: 'EVA001',
          quantity: 3,
        },
      ]),
    };
    const f = makeImportUsecase({ skuResolver });
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: makeNormalizedImportRow({ total: 120 }),
    });

    const result = await f.usecase.execute({
      rows: [{ total: 120 }] as any,
      userId: 'user-1',
    });

    expect(result.importedRows).toBe(1);
    expect(f.packMatcher.decompose).not.toHaveBeenCalled();
    expect(f.saleOrderItemRepo.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          referencePackId: null,
          description: 'Presentacion importada',
          quantity: 3,
          unitPrice: 40,
          total: 120,
        }),
      ],
      f.tx,
    );
    expect(f.componentRepo.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          skuId: 'sku-1',
          referencePackItemId: null,
          quantity: 3,
          unitPrice: 40,
          total: 120,
        }),
      ],
      f.tx,
    );
  });

  it('stores an exact unique composition as the registered pack', async () => {
    const skus = [
      {
        productId: 'product-1',
        skuId: 'sku-a',
        skuName: 'Producto A',
        customSku: 'EVA001',
        quantity: 1,
      },
      {
        productId: 'product-2',
        skuId: 'sku-b',
        skuName: 'Producto B',
        customSku: 'EVA002',
        quantity: 2,
      },
    ];
    const matchedPack = {
      pack: {
        packId: { value: 'pack-1' },
        description: 'Pack Registrado',
        total: 50,
        isActive: true,
      },
      items: [
        { id: 'pack-item-a', skuId: 'sku-a', lineTotal: 20 },
        { id: 'pack-item-b', skuId: 'sku-b', lineTotal: 30 },
      ],
    };
    const packMatcher = {
      decompose: jest.fn().mockResolvedValue({
        status: 'UNIQUE',
        composition: skus.map(({ skuId, quantity }) => ({ skuId, quantity })),
        pack: matchedPack,
        packQuantity: 1,
        leftovers: [],
        matches: [matchedPack],
      }),
    };
    const f = makeImportUsecase({
      skuResolver: { resolveOrCreateSkus: jest.fn().mockResolvedValue(skus) },
      packMatcher,
    });
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: makeNormalizedImportRow({ total: 100 }),
    });

    await f.usecase.execute({
      rows: [{ total: 100 }] as any,
      userId: 'user-1',
    });

    expect(packMatcher.decompose).toHaveBeenCalledWith(
      [
        { skuId: 'sku-a', quantity: 1 },
        { skuId: 'sku-b', quantity: 2 },
      ],
      f.tx,
    );
    expect(f.saleOrderItemRepo.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          referencePackId: 'pack-1',
          description: 'Pack Registrado',
          quantity: 1,
          unitPrice: 100,
          total: 100,
        }),
      ],
      f.tx,
    );
    expect(f.componentRepo.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          skuId: 'sku-a',
          referencePackItemId: 'pack-item-a',
          quantity: 1,
          unitPrice: 40,
          total: 40,
        }),
        expect.objectContaining({
          skuId: 'sku-b',
          referencePackItemId: 'pack-item-b',
          quantity: 2,
          unitPrice: 30,
          total: 60,
        }),
      ],
      f.tx,
    );
  });

  it('extracts a contained pack and stores surplus SKUs as independent products', async () => {
    const skus = [
      { productId: 'p1', skuId: 'sku-a', skuName: 'Producto 1', customSku: 'EVA001', quantity: 2 },
      { productId: 'p2', skuId: 'sku-b', skuName: 'Producto 2', customSku: 'EVA002', quantity: 1 },
      { productId: 'p3', skuId: 'sku-c', skuName: 'Producto 3', customSku: 'EVA003', quantity: 3 },
    ];
    const matchedPack = {
      pack: {
        packId: { value: 'pack-amor-propio' },
        description: 'Pack Amor Propio',
        total: 140,
        isActive: true,
      },
      items: [
        { id: 'pi-a', skuId: 'sku-a', quantity: 1, price: 20, lineTotal: 20 },
        { id: 'pi-b', skuId: 'sku-b', quantity: 1, price: 20, lineTotal: 20 },
        { id: 'pi-c', skuId: 'sku-c', quantity: 1, price: 20, lineTotal: 20 },
      ],
    };
    const f = makeImportUsecase({
      skuResolver: { resolveOrCreateSkus: jest.fn().mockResolvedValue(skus) },
      packMatcher: {
        decompose: jest.fn().mockResolvedValue({
          status: 'UNIQUE',
          composition: [],
          pack: matchedPack,
          packQuantity: 1,
          leftovers: [
            { skuId: 'sku-a', quantity: 1 },
            { skuId: 'sku-c', quantity: 2 },
          ],
          matches: [matchedPack],
        }),
      },
    });
    f.saleOrderItemRepo.bulkCreate.mockResolvedValue([
      { id: 'item-pack' },
      { id: 'item-a' },
      { id: 'item-c' },
    ]);
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: makeNormalizedImportRow({ total: 200 }),
    });

    await f.usecase.execute({ rows: [{ total: 200 }] as any, userId: 'user-1' });

    expect(f.saleOrderItemRepo.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          referencePackId: 'pack-amor-propio',
          description: 'Pack Amor Propio',
          quantity: 1,
          total: 140,
        }),
        expect.objectContaining({
          referencePackId: null,
          description: 'Producto 1',
          quantity: 1,
          total: 20,
        }),
        expect.objectContaining({
          referencePackId: null,
          description: 'Producto 3',
          quantity: 2,
          total: 40,
        }),
      ],
      f.tx,
    );
  });

  it('stores two unmatched SKUs as one unknown pack with exact cent totals', async () => {
    const skus = [
      {
        productId: 'product-2',
        skuId: 'sku-b',
        skuName: 'Producto B',
        customSku: 'EVA002',
        quantity: 1,
      },
      {
        productId: 'product-1',
        skuId: 'sku-a',
        skuName: 'Producto A',
        customSku: 'EVA001',
        quantity: 2,
      },
    ];
    const packMatcher = {
      decompose: jest.fn().mockResolvedValue({
        status: 'NONE',
        composition: [],
        matches: [],
      }),
    };
    const f = makeImportUsecase({
      skuResolver: { resolveOrCreateSkus: jest.fn().mockResolvedValue(skus) },
      packMatcher,
    });
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: makeNormalizedImportRow({ total: 10 }),
    });

    await f.usecase.execute({ rows: [{ total: 10 }] as any, userId: 'user-1' });

    expect(f.saleOrderItemRepo.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          referencePackId: null,
          description: 'Presentacion importada',
          quantity: 1,
          unitPrice: 10,
          total: 10,
        }),
      ],
      f.tx,
    );
    expect(f.componentRepo.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          skuId: 'sku-a',
          referencePackItemId: null,
          quantity: 2,
          unitPrice: 3.33,
          total: 6.66,
        }),
        expect.objectContaining({
          skuId: 'sku-b',
          referencePackItemId: null,
          quantity: 1,
          unitPrice: 3.34,
          total: 3.34,
        }),
      ],
      f.tx,
    );
    const savedComponents = f.componentRepo.bulkCreate.mock.calls[0][0];
    expect(
      savedComponents.reduce(
        (sum: number, component: { total: number }) => sum + component.total,
        0,
      ),
    ).toBe(10);
  });

  it('stores an ambiguous composition as an unknown pack', async () => {
    const skus = [
      {
        productId: 'product-1',
        skuId: 'sku-a',
        skuName: 'Producto A',
        customSku: 'EVA001',
        quantity: 1,
      },
      {
        productId: 'product-2',
        skuId: 'sku-b',
        skuName: 'Producto B',
        customSku: 'EVA002',
        quantity: 1,
      },
    ];
    const packMatcher = {
      decompose: jest.fn().mockResolvedValue({
        status: 'AMBIGUOUS',
        composition: [],
        matches: [{}, {}],
      }),
    };
    const f = makeImportUsecase({
      skuResolver: { resolveOrCreateSkus: jest.fn().mockResolvedValue(skus) },
      packMatcher,
    });
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: makeNormalizedImportRow(),
    });

    await f.usecase.execute({ rows: [{}] as any, userId: 'user-1' });

    expect(f.saleOrderItemRepo.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ referencePackId: null })],
      f.tx,
    );
    expect(f.componentRepo.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ referencePackItemId: null }),
        expect.objectContaining({ referencePackItemId: null }),
      ]),
      f.tx,
    );
  });

  it('reports normalization errors', async () => {
    const normalizer = { normalize: jest.fn() };
    normalizer.normalize.mockResolvedValue({
      ok: false,
      rowNumber: 2,
      errors: ['Numero de telefono es obligatorio'],
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateFromImportPreviewUseCase,
        {
          provide: UNIT_OF_WORK,
          useValue: { runInTransaction: (work: any) => work({}) },
        },
        { provide: SALE_ORDER_REPOSITORY, useValue: { create: jest.fn() } },
        {
          provide: SALE_ORDER_ITEM_REPOSITORY,
          useValue: { bulkCreate: jest.fn() },
        },
        {
          provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
          useValue: { bulkCreate: jest.fn() },
        },
        {
          provide: SALE_PAYMENT_REPOSITORY,
          useValue: { bulkCreate: jest.fn() },
        },
        { provide: SaleOrderImportRowNormalizerService, useValue: normalizer },
        {
          provide: SaleOrderImportClientResolverService,
          useValue: { resolveOrCreate: jest.fn() },
        },
        {
          provide: SaleOrderImportSourceResolverService,
          useValue: { resolveOrCreate: jest.fn() },
        },
        {
          provide: SaleOrderImportSkuResolverService,
          useValue: { resolveOrCreateSkus: jest.fn() },
        },
        {
          provide: WORKFLOW_REPOSITORY,
          useValue: { findActiveByNormalizedName: jest.fn() },
        },
        {
          provide: SaleOrderNumberingService,
          useValue: { reserveNext: jest.fn() },
        },
        {
          provide: AssignImportLoteUsecase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: SaleOrderPackMatcherService,
            useValue: { decompose: jest.fn() },
        },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(CreateFromImportPreviewUseCase);
      const result = await usecase.execute({
        rows: [{} as any],
        userId: 'user-1',
      });
      expect(result.importedRows).toBe(0);
      expect(result.failedRows).toBe(1);
      expect(result.errors[0].rowNumber).toBe(2);
    } finally {
      await moduleRef.close();
    }
  });

  it('stores imported address on agencyDetail and does not change the client address', async () => {
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
        deliveryDate: '2026-07-06',
        workflowName: null,
        address: 'Av. Cliente 123',
        productName: 'Pack Aloe',
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

    await f.usecase.execute({
      rows: [{ total: 120 } as any],
      userId: 'user-1',
    });

    expect(f.clientResolver.resolveOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ address: null }),
      tx,
    );
    expect(f.saleOrderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agencySubsidiaryId: null,
        agencyDetail: 'Av. Cliente 123',
      }),
      tx,
    );
    expect(tx.manager.getRepository).not.toHaveBeenCalled();
  });

  it('does not match import address against agency subsidiaries', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'subsidiary-1',
        address: 'Av. Sucursal 456',
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
        deliveryDate: '2026-07-06',
        workflowName: null,
        address: 'Sucursal Norte',
        productName: 'Pack Aloe',
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

    await f.usecase.execute({
      rows: [{ total: 120 } as any],
      userId: 'user-1',
    });

    expect(f.clientResolver.resolveOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ address: null }),
      tx,
    );
    expect(f.saleOrderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agencySubsidiaryId: null,
        agencyDetail: 'Sucursal Norte',
      }),
      tx,
    );
    expect(tx.manager.getRepository).not.toHaveBeenCalled();
  });

  it('uses the imported pack name as the sale order item description', async () => {
    const f = makeImportUsecase();
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: '2026-07-06',
        workflowName: null,
        address: null,
        productName: 'Pack Aloe',
        internalNote: null,
        advertisingCode: null,
        total: 120,
        advance: 0,
        deliveryCost: 0,
        couponCode: 'COUPON-IGNORED-AS-DESCRIPTION',
        parsedSkus: [],
        clientResolution: { clientId: null, matchedBy: null },
      },
    });

    await f.usecase.execute({
      rows: [{ total: 120 } as any],
      userId: 'user-1',
    });

    expect(f.saleOrderItemRepo.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          description: 'Pack Aloe',
        }),
      ],
      expect.anything(),
    );
  });

  it('uses Sin nombre when the imported pack name is empty', async () => {
    const f = makeImportUsecase();
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: '2026-07-06',
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

    await f.usecase.execute({
      rows: [{ total: 120 } as any],
      userId: 'user-1',
    });

    expect(f.saleOrderItemRepo.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          description: 'Sin nombre',
        }),
      ],
      expect.anything(),
    );
  });

  it('stores null instead of the raw Confirmado por name when no adviser is resolved', async () => {
    const f = makeImportUsecase();
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: '2026-07-06',
        orderDate: '2026-07-04',
        workflowName: null,
        address: null,
        productName: 'Pack Aloe',
        internalNote: null,
        advertisingCode: null,
        total: 120,
        advance: 0,
        deliveryCost: 0,
        couponCode: null,
        confirmedBy: 'Analucia Pazos Arroyo',
        parsedSkus: [],
        clientResolution: { clientId: null, matchedBy: null },
      },
    });

    await f.usecase.execute({
      rows: [{ total: 120 } as any],
      userId: 'user-1',
    });

    expect(f.saleOrderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        assignedBy: null,
      }),
      expect.anything(),
    );
  });

  it('stores the adviser user id when Confirmado por matches an active adviser name', async () => {
    const adviserResolver = {
      resolveByName: jest.fn().mockResolvedValue('adviser-user-1'),
    };
    const f = makeImportUsecase({ adviserResolver });
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: '2026-07-06',
        orderDate: '2026-07-04',
        workflowName: null,
        address: null,
        productName: 'Pack Aloe',
        internalNote: null,
        advertisingCode: null,
        total: 120,
        advance: 0,
        deliveryCost: 0,
        couponCode: null,
        confirmedBy: 'Analucia Pazos Arroyo',
        parsedSkus: [],
        clientResolution: { clientId: null, matchedBy: null },
      },
    });

    await f.usecase.execute({
      rows: [{ total: 120 } as any],
      userId: 'user-1',
    });

    expect(adviserResolver.resolveByName).toHaveBeenCalledWith(
      'Analucia Pazos Arroyo',
      f.tx,
    );
    expect(f.saleOrderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        assignedBy: 'adviser-user-1',
      }),
      expect.anything(),
    );
  });

  it('uses the imported order date as the sale order schedule date', async () => {
    const f = makeImportUsecase();
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: '2026-07-06',
        orderDate: '2026-07-04',
        workflowName: null,
        address: null,
        productName: 'Pack Aloe',
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

    await f.usecase.execute({
      rows: [{ total: 120 } as any],
      userId: 'user-1',
    });

    expect(f.saleOrderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleDate: '2026-07-04',
        deliveryDate: '2026-07-06',
        createdAt: null,
      }),
      expect.anything(),
    );
  });

  it('does not roll an invalid imported order date into another local day', async () => {
    const f = makeImportUsecase();
    f.normalizer.normalize.mockResolvedValue({
      ok: true,
      row: {
        deliveryDate: '2026-03-01',
        orderDate: '2026-02-31',
        workflowName: null,
        address: null,
        productName: 'Pack Aloe',
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

    await f.usecase.execute({
      rows: [{ total: 120 } as any],
      userId: 'user-1',
    });

    expect(f.saleOrderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: null }),
      expect.anything(),
    );
  });
});
