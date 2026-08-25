import { SaveSaleOrderWithClientUsecase } from './save-with-client.usecase';

describe('SaveSaleOrderWithClientUsecase', () => {
  const tx = { id: 'shared-tx' } as any;
  const data = {
    client: { mode: 'existing' as const, id: 'client-1' },
    warehouseId: 'warehouse-1',
    workflowId: 'workflow-1',
    deliveryCost: 5,
    discount: 2,
    items: [
      {
        quantity: 1,
        unitPrice: 20,
        total: 20,
        components: [
          { skuId: 'sku-1', quantity: 1, unitPrice: 20, total: 20 },
        ],
      },
    ],
    payments: [
      {
        clientKey: 'new-1',
        method: 'EFECTIVO',
        amount: 10,
        date: '2026-07-03T00:00:00.000Z',
      },
    ],
    removedAttachmentIds: [],
  };

  function fixture() {
    const clientCommands = {
      execute: jest.fn().mockResolvedValue({
        clientId: 'client-1',
        event: { clientId: 'client-1' },
      }),
    };
    const createOrder = {
      executeInTransaction: jest.fn().mockResolvedValue({
        orderId: 'order-1',
        serie: 'PE',
        correlative: 1,
        workflowId: 'workflow-1',
        currentStateId: 'state-1',
      }),
    };
    const updateOrder = { executeInTransaction: jest.fn() };
    const paymentReconciler = {
      reconcile: jest.fn().mockResolvedValue({
        paymentIdByClientKey: new Map([['new-1', 'payment-1']]),
        retiredPaymentIds: [],
      }),
    };
    const paymentWorkflowReconciliation = {
      reconcile: jest.fn().mockResolvedValue({ stateChanged: true }),
    };
    const stockCorrection = {
      consumeCorrectedSaleOrder: jest.fn().mockResolvedValue(undefined),
    };
    const attachmentRepo = {
      list: jest.fn().mockResolvedValue([]),
      markDeleted: jest.fn(),
      create: jest.fn().mockImplementation((attachment) =>
        Promise.resolve({ ...attachment, id: 'attachment-1' }),
      ),
    };
    const fileStorage = {
      save: jest.fn().mockResolvedValue({
        filename: 'shipping.png',
        relativePath: 'sale-order-attachments/order-1/shipping.png',
      }),
      delete: jest.fn().mockResolvedValue(true),
    };
    const clientRealtime = { emitClientUpdated: jest.fn() };
    const imageProcessor = {
      toWebp: jest.fn().mockResolvedValue({
        buffer: Buffer.from('webp'),
        extension: 'webp',
        mimeType: 'image/webp',
        sizeBytes: 4,
      }),
    };
    const uow = {
      runInTransaction: jest.fn((work) => work(tx)),
    };

    return {
      clientCommands,
      createOrder,
      updateOrder,
      paymentReconciler,
      attachmentRepo,
      fileStorage,
      clientRealtime,
      imageProcessor,
      usecase: new SaveSaleOrderWithClientUsecase(
        uow as any,
        clientCommands as any,
        createOrder as any,
        updateOrder as any,
        paymentReconciler as any,
        attachmentRepo as any,
        fileStorage as any,
        clientRealtime as any,
        imageProcessor as any,
        undefined,
        paymentWorkflowReconciliation as any,
        stockCorrection as any,
      ),
      paymentWorkflowReconciliation,
      stockCorrection,
    };
  }

  it('uses one transaction for client, order, payments and attachments', async () => {
    const f = fixture();
    const shippingPhoto = {
      originalname: 'shipping.png',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    const result = await f.usecase.execute({
      data,
      shippingPhoto,
      paymentPhotoByClientKey: new Map(),
      userId: 'user-1',
    });

    expect(f.clientCommands.execute).toHaveBeenCalledWith(data.client, tx);
    expect(f.createOrder.executeInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'client-1', payments: undefined }),
      'user-1',
      tx,
    );
    expect(f.paymentReconciler.reconcile).toHaveBeenCalledWith(
      expect.objectContaining({ saleOrderId: 'order-1' }),
      tx,
    );
    expect(f.attachmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ saleOrderId: 'order-1' }),
      tx,
    );
    expect(f.clientRealtime.emitClientUpdated).toHaveBeenCalledWith({
      clientId: 'client-1',
    });
    expect(result).toEqual(
      expect.objectContaining({ orderId: 'order-1', clientId: 'client-1' }),
    );
  });

  it('requires a workflow when creating a new order', async () => {
    const f = fixture();

    await expect(
      f.usecase.execute({
        data: { ...data, workflowId: undefined },
        paymentPhotoByClientKey: new Map(),
        userId: 'user-1',
      }),
    ).rejects.toThrow('El tipo de pedido es requerido');

    expect(f.clientCommands.execute).not.toHaveBeenCalled();
    expect(f.createOrder.executeInTransaction).not.toHaveBeenCalled();
  });

  it('preserves a missing workflow when updating a legacy imported order', async () => {
    const f = fixture();
    f.updateOrder.executeInTransaction.mockResolvedValue({
      orderId: 'legacy-order-1',
      serie: 'PE',
      correlative: 28,
      workflowId: null,
      currentStateId: null,
    });

    await f.usecase.execute({
      saleOrderId: 'legacy-order-1',
      data: { ...data, workflowId: undefined },
      paymentPhotoByClientKey: new Map(),
      userId: 'user-1',
    });

    expect(f.updateOrder.executeInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        saleOrderId: 'legacy-order-1',
        workflowId: undefined,
      }),
      tx,
      {
        deferPaymentWorkflowReconciliation: true,
        executedBy: 'user-1',
      },
    );
    expect(f.createOrder.executeInTransaction).not.toHaveBeenCalled();
  });

  it('reconciles payment workflow after saving the final prices and payments', async () => {
    const f = fixture();
    f.updateOrder.executeInTransaction.mockResolvedValue({
      orderId: 'order-1',
      serie: 'PE',
      correlative: 28,
      workflowId: 'workflow-1',
      currentStateId: 'state-to-send',
      previousTotal: 0,
      totalChanged: true,
    });

    await f.usecase.execute({
      saleOrderId: 'order-1',
      data: {
        ...data,
        items: data.items.map((item) => ({
          ...item,
          unitPrice: 119.9,
          total: 119.9,
        })),
      },
      paymentPhotoByClientKey: new Map(),
      userId: 'user-1',
    });

    expect(f.paymentWorkflowReconciliation.reconcile).toHaveBeenCalledWith(
      {
        saleOrderId: 'order-1',
        executedBy: 'user-1',
        source: 'sale-order-with-client-save',
        previousTotal: 0,
      },
      tx,
    );
    expect(
      f.paymentReconciler.reconcile.mock.invocationCallOrder[0],
    ).toBeLessThan(
      f.paymentWorkflowReconciliation.reconcile.mock.invocationCallOrder[0],
    );
  });

  it('passes the previous and current delivery dates to the workflow reconciliation', async () => {
    const f = fixture();
    f.updateOrder.executeInTransaction.mockResolvedValue({
      orderId: 'order-1',
      serie: 'PE',
      correlative: 28,
      workflowId: 'workflow-1',
      currentStateId: 'state-waiting',
      previousTotal: 25,
      totalChanged: false,
      previousDeliveryDate: '2026-08-21',
      deliveryDate: '2026-08-25',
      deliveryDateChanged: true,
    });

    await f.usecase.execute({
      saleOrderId: 'order-1',
      data: { ...data, deliveryDate: '2026-08-25' },
      paymentPhotoByClientKey: new Map(),
      userId: 'user-1',
    });

    expect(f.paymentWorkflowReconciliation.reconcile).toHaveBeenCalledWith(
      expect.objectContaining({
        previousDeliveryDate: '2026-08-21',
        currentDeliveryDate: '2026-08-25',
      }),
      tx,
    );
  });

  it('consumes the corrected composition again when a paid order remains final', async () => {
    const f = fixture();
    f.updateOrder.executeInTransaction.mockResolvedValue({
      orderId: 'order-1',
      serie: 'PE',
      correlative: 28,
      workflowId: 'workflow-1',
      currentStateId: 'state-delivered',
      previousTotal: 100,
      totalChanged: false,
      stockCompositionReplaced: true,
      previousStockStatus: 'CONSUMED',
    });
    f.paymentWorkflowReconciliation.reconcile.mockResolvedValue({
      stateChanged: false,
      currentState: { id: 'state-delivered' },
    });

    await f.usecase.execute({
      saleOrderId: 'order-1',
      data,
      paymentPhotoByClientKey: new Map(),
      userId: 'user-1',
    });

    expect(f.stockCorrection.consumeCorrectedSaleOrder).toHaveBeenCalledWith(
      'order-1',
      tx,
    );
  });

  it('deletes newly written files when the database transaction fails', async () => {
    const f = fixture();
    f.attachmentRepo.create.mockRejectedValueOnce(new Error('db failed'));
    const paymentPhoto = {
      originalname: 'proof.png',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    await expect(
      f.usecase.execute({
        data,
        paymentPhotoByClientKey: new Map([['new-1', paymentPhoto]]),
        userId: 'user-1',
      }),
    ).rejects.toThrow('db failed');

    expect(f.fileStorage.delete).toHaveBeenCalledWith(
      'sale-order-attachments/order-1/shipping.png',
    );
    expect(f.clientRealtime.emitClientUpdated).not.toHaveBeenCalled();
  });

  it('converts non-PNG sale order photos to WEBP before saving', async () => {
    const f = fixture();
    f.fileStorage.save.mockResolvedValueOnce({
      filename: 'payment_proof.webp',
      relativePath: 'sale-order-attachments/order-1/payment_proof.webp',
    });
    const paymentPhoto = {
      originalname: 'proof.jpg',
      mimetype: 'image/jpeg',
      size: 3,
      buffer: Buffer.from('jpg'),
    } as Express.Multer.File;

    await f.usecase.execute({
      data,
      paymentPhotoByClientKey: new Map([['new-1', paymentPhoto]]),
      userId: 'user-1',
    });

    expect(f.imageProcessor.toWebp).toHaveBeenCalledWith(expect.objectContaining({
      buffer: paymentPhoto.buffer,
    }));
    expect(f.fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      area: 'public',
      buffer: Buffer.from('webp'),
      extension: 'webp',
    }));
    expect(f.attachmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'payment_proof.webp',
        mimeType: 'image/webp',
        sizeBytes: 4,
      }),
      tx,
    );
  });

  it('keeps PNG sale order photos without converting them', async () => {
    const f = fixture();
    const shippingPhoto = {
      originalname: 'shipping.png',
      mimetype: 'image/png',
      size: 3,
      buffer: Buffer.from('png'),
    } as Express.Multer.File;

    await f.usecase.execute({
      data,
      shippingPhoto,
      paymentPhotoByClientKey: new Map(),
      userId: 'user-1',
    });

    expect(f.imageProcessor.toWebp).not.toHaveBeenCalled();
    expect(f.fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      area: 'public',
      buffer: shippingPhoto.buffer,
      extension: 'png',
    }));
  });
});
