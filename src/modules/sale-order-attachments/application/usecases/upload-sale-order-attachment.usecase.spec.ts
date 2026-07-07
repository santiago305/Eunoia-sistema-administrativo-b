import { existsSync } from 'fs';
import { join } from 'path';

const usecasePath = join(
  __dirname,
  'upload-sale-order-attachment.usecase',
);

const buildFile = (): Express.Multer.File =>
  ({
    buffer: Buffer.from('image'),
    mimetype: 'image/png',
    originalname: 'proof.png',
    size: 5,
  }) as Express.Multer.File;

describe('UploadSaleOrderAttachmentUsecase', () => {
  it('rejects a payment that does not belong to the sale order', async () => {
    expect(existsSync(`${usecasePath}.ts`)).toBe(true);
    if (!existsSync(`${usecasePath}.ts`)) return;

    const {
      UploadSaleOrderAttachmentUsecase,
    } = require(usecasePath) as {
      UploadSaleOrderAttachmentUsecase: new (
        attachmentRepo: unknown,
        fileStorage: unknown,
        manager: unknown,
        uow: unknown,
      ) => {
        execute(input: unknown, userId?: string): Promise<unknown>;
      };
    };
    const attachmentRepo = {
      list: jest.fn(),
      create: jest.fn(),
      markDeleted: jest.fn(),
    };
    const fileStorage = { save: jest.fn(), delete: jest.fn() };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => {
        if (entity.name === 'SaleOrderEntity') {
          return { findOne: jest.fn().mockResolvedValue({ id: 'order-1' }) };
        }
        return {
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'payment-1', saleOrderId: 'order-2' }),
        };
      }),
    };
    const uow = {
      runInTransaction: jest.fn((work) => work({ tx: true })),
    };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo,
      fileStorage,
      manager,
      uow,
    );

    await expect(
      usecase.execute(
        {
          saleOrderId: 'order-1',
          saleOrderPaymentId: 'payment-1',
          type: 'PAYMENT_PROOF',
          file: buildFile(),
        },
        'user-1',
      ),
    ).rejects.toThrow('El pago no pertenece al pedido indicado');
    expect(fileStorage.save).not.toHaveBeenCalled();
  });

  it('deletes the newly written file when database persistence fails', async () => {
    expect(existsSync(`${usecasePath}.ts`)).toBe(true);
    if (!existsSync(`${usecasePath}.ts`)) return;

    const {
      UploadSaleOrderAttachmentUsecase,
    } = require(usecasePath) as {
      UploadSaleOrderAttachmentUsecase: new (
        attachmentRepo: unknown,
        fileStorage: unknown,
        manager: unknown,
        uow: unknown,
      ) => {
        execute(input: unknown, userId?: string): Promise<unknown>;
      };
    };
    const attachmentRepo = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockRejectedValue(new Error('db failed')),
      markDeleted: jest.fn(),
    };
    const fileStorage = {
      save: jest.fn().mockResolvedValue({
        filename: 'proof.png',
        relativePath: '/api/assets/sale-order-attachments/order-1/proof.png',
      }),
      delete: jest.fn().mockResolvedValue(true),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ id: 'order-1' }),
      }),
    };
    const uow = {
      runInTransaction: jest.fn((work) => work({ tx: true })),
    };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo,
      fileStorage,
      manager,
      uow,
    );

    await expect(
      usecase.execute(
        {
          saleOrderId: 'order-1',
          type: 'SHIPPING_PHOTO',
          file: buildFile(),
        },
        'user-1',
      ),
    ).rejects.toThrow('db failed');
    expect(fileStorage.delete).toHaveBeenCalledWith(
      '/api/assets/sale-order-attachments/order-1/proof.png',
    );
  });
});
