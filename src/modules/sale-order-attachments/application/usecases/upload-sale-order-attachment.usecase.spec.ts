import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';

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
  it('returns the prior attachment for the same user, payment, key, and file bytes', async () => {
    const { UploadSaleOrderAttachmentUsecase } = await import('./upload-sale-order-attachment.usecase');
    const file = buildFile();
    const idempotencyKey = '11111111-1111-4111-8111-111111111111';
    const contentSha256 = createHash('sha256').update(file.buffer).digest('hex');
    const prior = {
      id: 'prior-proof', saleOrderId: 'order-1', saleOrderPaymentId: 'payment-1',
      type: 'PAYMENT_PROOF', filename: 'proof.webp', originalName: 'proof.png',
      mimeType: 'image/webp', sizeBytes: 100, url: 'private/proof.webp',
      storagePath: 'private/proof.webp', uploadedByUserId: 'user-1', note: null,
      deletedAt: null, uploadIdempotencyKey: idempotencyKey, contentSha256,
      createdAt: new Date('2026-10-13T12:00:00.000Z'),
    };
    const attachmentRepo = {
      findByUploadIdempotencyKey: jest.fn().mockResolvedValue(prior),
    };
    const fileStorage = { save: jest.fn(), delete: jest.fn() };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => ({
        findOne: jest.fn().mockResolvedValue(
          entity.name === 'SaleOrderEntity'
            ? { id: 'order-1', isActive: true }
            : { id: 'payment-1', saleOrderId: 'order-1' },
        ),
      })),
    };
    const uow = { runInTransaction: jest.fn() };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo as never, fileStorage as never, manager as never, uow as never, {} as never,
    );

    const result = await usecase.execute({
      saleOrderId: 'order-1', saleOrderPaymentId: 'payment-1',
      type: 'PAYMENT_PROOF', storageArea: 'private', file, idempotencyKey,
    }, 'user-1');

    expect(result).toMatchObject({ id: 'prior-proof', idempotentReplay: true });
    expect(fileStorage.save).not.toHaveBeenCalled();
    expect(uow.runInTransaction).not.toHaveBeenCalled();
  });

  it('rejects reusing an evidence upload key with different file bytes', async () => {
    const { UploadSaleOrderAttachmentUsecase } = await import('./upload-sale-order-attachment.usecase');
    const file = buildFile();
    const attachmentRepo = {
      findByUploadIdempotencyKey: jest.fn().mockResolvedValue({ contentSha256: '0'.repeat(64) }),
    };
    const fileStorage = { save: jest.fn(), delete: jest.fn() };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => ({
        findOne: jest.fn().mockResolvedValue(
          entity.name === 'SaleOrderEntity'
            ? { id: 'order-1', isActive: true }
            : { id: 'payment-1', saleOrderId: 'order-1' },
        ),
      })),
    };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo as never, fileStorage as never, manager as never, {} as never, {} as never,
    );

    const error = await usecase.execute({
      saleOrderId: 'order-1', saleOrderPaymentId: 'payment-1',
      type: 'PAYMENT_PROOF', file, idempotencyKey: '11111111-1111-4111-8111-111111111111',
    }, 'user-1').catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(fileStorage.save).not.toHaveBeenCalled();
  });

  it('recovers a concurrent same-file retry after the scoped unique index wins', async () => {
    const { UploadSaleOrderAttachmentUsecase } = await import('./upload-sale-order-attachment.usecase');
    const file = buildFile();
    const idempotencyKey = '11111111-1111-4111-8111-111111111111';
    const contentSha256 = createHash('sha256').update(file.buffer).digest('hex');
    const prior = {
      id: 'committed-proof', saleOrderId: 'order-1', saleOrderPaymentId: 'payment-1',
      type: 'PAYMENT_PROOF', filename: 'proof.webp', originalName: 'proof.png',
      mimeType: 'image/webp', sizeBytes: 100, url: 'private/committed.webp',
      storagePath: 'private/committed.webp', uploadedByUserId: 'user-1', note: null,
      deletedAt: null, uploadIdempotencyKey: idempotencyKey, contentSha256,
      createdAt: new Date('2026-10-13T12:00:00.000Z'),
    };
    const attachmentRepo = {
      findByUploadIdempotencyKey: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(prior),
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockRejectedValue({ driverError: { code: '23505' } }),
      markDeleted: jest.fn(),
    };
    const fileStorage = {
      save: jest.fn().mockResolvedValue({ area: 'staging', key: 'staging/order-1/retry.webp', filename: 'retry.webp', relativePath: 'staging/order-1/retry.webp' }),
      read: jest.fn().mockResolvedValue(file.buffer),
      exists: jest.fn().mockResolvedValue(false),
      resolve: jest.fn((key: string) => ({ area: key.split('/')[0], key, filename: key.split('/').pop(), relativePath: key })),
      move: jest.fn().mockResolvedValue({ area: 'private', key: 'private/order-1/retry.webp', filename: 'retry.webp', relativePath: 'private/order-1/retry.webp' }),
      delete: jest.fn().mockResolvedValue(true),
    };
    const uploadOperation = {
      id: 'upload-operation-1', status: 'PREPARING', source_content_sha256: contentSha256,
      prepared_content_sha256: contentSha256, staging_key: null, promoted_key: null,
      quarantine_key: null, lease_until: new Date(Date.now() + 60_000),
    };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => ({
        findOne: jest.fn().mockResolvedValue(
          entity.name === 'SaleOrderEntity'
            ? { id: 'order-1', isActive: true }
            : { id: 'payment-1', saleOrderId: 'order-1' },
        ),
      })),
      query: jest.fn(async (sql: string) => sql.includes('INSERT INTO payment_evidence_upload_operations') ? [uploadOperation] : []),
    };
    const uow = { runInTransaction: jest.fn((work) => work({ manager: { query: jest.fn() } })) };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo as never, fileStorage as never, manager as never, uow as never, {} as never,
    );

    const result = await usecase.execute({
      saleOrderId: 'order-1', saleOrderPaymentId: 'payment-1',
      type: 'PAYMENT_PROOF', storageArea: 'private', file, idempotencyKey,
    }, 'user-1');

    expect(result).toMatchObject({ id: 'committed-proof', idempotentReplay: true });
    expect(fileStorage.delete).toHaveBeenCalledWith('private/order-1/retry.webp');
  });

  it('rejects a payment that does not belong to the sale order', async () => {
    expect(existsSync(`${usecasePath}.ts`)).toBe(true);
    if (!existsSync(`${usecasePath}.ts`)) return;

    const {
      UploadSaleOrderAttachmentUsecase,
    } = await import(usecasePath) as {
      UploadSaleOrderAttachmentUsecase: new (
        attachmentRepo: unknown,
        fileStorage: unknown,
        manager: unknown,
        uow: unknown,
        imageProcessor?: unknown,
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
          return { findOne: jest.fn().mockResolvedValue({ id: 'order-1', isActive: true }) };
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
    const imageProcessor = { toWebp: jest.fn() };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo,
      fileStorage,
      manager,
      uow,
      imageProcessor,
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
    } = await import(usecasePath) as {
      UploadSaleOrderAttachmentUsecase: new (
        attachmentRepo: unknown,
        fileStorage: unknown,
        manager: unknown,
        uow: unknown,
        imageProcessor?: unknown,
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
      getRepository: jest.fn((entity: { name?: string }) => ({
        findOne: jest.fn().mockResolvedValue(
          entity.name === 'SaleOrderEntity'
            ? { id: 'order-1', isActive: true }
            : { id: 'payment-1', saleOrderId: 'order-1' },
        ),
      })),
    };
    const uow = {
      runInTransaction: jest.fn((work) => work({ tx: true })),
    };
    const imageProcessor = { toWebp: jest.fn() };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo,
      fileStorage,
      manager,
      uow,
      imageProcessor,
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

  it('converts non-PNG sale order images to WEBP before saving', async () => {
    expect(existsSync(`${usecasePath}.ts`)).toBe(true);
    if (!existsSync(`${usecasePath}.ts`)) return;

    const {
      UploadSaleOrderAttachmentUsecase,
    } = await import(usecasePath) as {
      UploadSaleOrderAttachmentUsecase: new (
        attachmentRepo: unknown,
        fileStorage: unknown,
        manager: unknown,
        uow: unknown,
        imageProcessor?: unknown,
      ) => {
        execute(input: unknown, userId?: string): Promise<unknown>;
      };
    };
    const attachmentRepo = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn((attachment) => Promise.resolve(attachment)),
      markDeleted: jest.fn(),
    };
    const fileStorage = {
      save: jest.fn().mockResolvedValue({
        filename: 'payment_proof.webp',
        relativePath: '/api/assets/sale-order-attachments/order-1/payment_proof.webp',
      }),
      delete: jest.fn().mockResolvedValue(true),
    };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => ({
        findOne: jest.fn().mockResolvedValue(
          entity.name === 'SaleOrderEntity'
            ? { id: 'order-1', isActive: true }
            : { id: 'payment-1', saleOrderId: 'order-1' },
        ),
      })),
    };
    const uow = {
      runInTransaction: jest.fn((work) => work({ tx: true })),
    };
    const imageProcessor = {
      toWebp: jest.fn().mockResolvedValue({
        buffer: Buffer.from('webp'),
        extension: 'webp',
        mimeType: 'image/webp',
        sizeBytes: 4,
      }),
    };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo,
      fileStorage,
      manager,
      uow,
      imageProcessor,
    );
    const jpg = {
      buffer: Buffer.from('jpg'),
      mimetype: 'image/jpeg',
      originalname: 'proof.jpg',
      size: 3,
    } as Express.Multer.File;

    await usecase.execute(
      {
        saleOrderId: 'order-1',
        type: 'SHIPPING_PHOTO',
        file: jpg,
      },
      'user-1',
    );

    expect(imageProcessor.toWebp).toHaveBeenCalledWith(expect.objectContaining({
      buffer: jpg.buffer,
    }));
    expect(fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      area: 'public',
      buffer: Buffer.from('webp'),
      extension: 'webp',
    }));
    expect(attachmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: 'image/webp',
        sizeBytes: 4,
      }),
      { tx: true },
    );
  });

  it('keeps the previous payment-proof binary when replacing the active evidence', async () => {
    expect(existsSync(`${usecasePath}.ts`)).toBe(true);
    if (!existsSync(`${usecasePath}.ts`)) return;

    const {
      UploadSaleOrderAttachmentUsecase,
    } = await import(usecasePath) as {
      UploadSaleOrderAttachmentUsecase: new (
        attachmentRepo: unknown,
        fileStorage: unknown,
        manager: unknown,
        uow: unknown,
        imageProcessor?: unknown,
      ) => { execute(input: unknown, userId?: string): Promise<unknown> };
    };
    const previous = {
      id: 'previous-proof',
      storagePath: 'private/sale-order-attachments/order-1/old-proof.webp',
    };
    const attachmentRepo = {
      list: jest.fn().mockResolvedValue([previous]),
      create: jest.fn((attachment) => Promise.resolve(attachment)),
      markDeleted: jest.fn(),
    };
    const fileStorage = {
      save: jest.fn().mockResolvedValue({ area: 'staging', key: 'staging/sale-order-attachments/order-1/new-proof.webp', filename: 'new-proof.webp', relativePath: 'staging/sale-order-attachments/order-1/new-proof.webp' }),
      read: jest.fn().mockResolvedValue(Buffer.from('image')),
      exists: jest.fn().mockResolvedValue(false),
      resolve: jest.fn((key: string) => ({ area: key.split('/')[0], key, filename: key.split('/').pop(), relativePath: key })),
      move: jest.fn().mockResolvedValue({ area: 'private', key: 'private/sale-order-attachments/order-1/new-proof.webp', filename: 'new-proof.webp', relativePath: 'private/sale-order-attachments/order-1/new-proof.webp' }),
      delete: jest.fn().mockResolvedValue(true),
    };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => ({
        findOne: jest.fn().mockResolvedValue(
          entity.name === 'SaleOrderEntity'
            ? { id: 'order-1', isActive: true }
            : { id: 'payment-1', saleOrderId: 'order-1' },
        ),
      })),
    };
    const uow = { runInTransaction: jest.fn((work) => work({ tx: true })) };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo,
      fileStorage,
      manager,
      uow,
      { toWebp: jest.fn() },
    );

    await usecase.execute(
      {
        saleOrderId: 'order-1',
        saleOrderPaymentId: 'payment-1',
        type: 'PAYMENT_PROOF',
        storageArea: 'private',
        file: buildFile(),
      },
      'user-1',
    );

    expect(attachmentRepo.markDeleted).toHaveBeenCalledWith(
      'previous-proof',
      expect.any(Date),
      { tx: true },
    );
    expect(fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({ area: 'staging' }));
    expect(fileStorage.move).toHaveBeenCalledWith(
      'staging/sale-order-attachments/order-1/new-proof.webp',
      'private/sale-order-attachments/order-1/new-proof.webp',
    );
    expect(fileStorage.delete).not.toHaveBeenCalledWith(previous.storagePath);
  });

  it('never promotes staged evidence whose bytes fail the integrity check', async () => {
    const { UploadSaleOrderAttachmentUsecase } = await import('./upload-sale-order-attachment.usecase');
    const attachmentRepo = { list: jest.fn(), create: jest.fn(), markDeleted: jest.fn() };
    const fileStorage = {
      save: jest.fn().mockResolvedValue({ area: 'staging', key: 'staging/evidence/proof.png', filename: 'proof.png', relativePath: 'staging/evidence/proof.png' }),
      read: jest.fn().mockResolvedValue(Buffer.from('corrupt')),
      move: jest.fn(),
      delete: jest.fn().mockResolvedValue(true),
    };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => ({
        findOne: jest.fn().mockResolvedValue(entity.name === 'SaleOrderEntity'
          ? { id: 'order-1', isActive: true }
          : { id: 'payment-1', saleOrderId: 'order-1' }),
      })),
    };
    const uow = { runInTransaction: jest.fn() };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo as never, fileStorage as never, manager as never, uow as never, { toWebp: jest.fn() } as never,
    );

    await expect(usecase.execute({
      saleOrderId: 'order-1', saleOrderPaymentId: 'payment-1', type: 'PAYMENT_PROOF',
      storageArea: 'private', file: buildFile(),
    }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(fileStorage.move).not.toHaveBeenCalled();
    expect(attachmentRepo.create).not.toHaveBeenCalled();
    expect(uow.runInTransaction).not.toHaveBeenCalled();
    expect(fileStorage.delete).toHaveBeenCalledWith('staging/evidence/proof.png');
  });

  it('resumes a verified promoted file after the original request stopped before the database commit', async () => {
    const { UploadSaleOrderAttachmentUsecase } = await import('./upload-sale-order-attachment.usecase');
    const file = buildFile();
    const digest = createHash('sha256').update(file.buffer).digest('hex');
    const operation = {
      id: 'operation-1', status: 'PROMOTED', source_content_sha256: digest,
      prepared_content_sha256: digest, staging_key: null,
      promoted_key: 'private/sale-order-attachments/order-1/retry.webp',
      quarantine_key: null, lease_until: new Date(Date.now() - 1000),
    };
    const attachmentRepo = {
      findByUploadIdempotencyKey: jest.fn().mockResolvedValue(null),
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn((value) => Promise.resolve({ ...value, id: 'attachment-created' })),
      markDeleted: jest.fn(),
    };
    const fileStorage = {
      save: jest.fn(),
      exists: jest.fn().mockResolvedValue(true),
      read: jest.fn().mockResolvedValue(file.buffer),
      resolve: jest.fn((key: string) => ({ area: 'private', key, filename: 'retry.webp', relativePath: key })),
      move: jest.fn(),
      delete: jest.fn().mockResolvedValue(true),
    };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => ({
        findOne: jest.fn().mockResolvedValue(entity.name === 'SaleOrderEntity'
          ? { id: 'order-1', isActive: true }
          : { id: 'payment-1', saleOrderId: 'order-1' }),
      })),
      query: jest.fn(async (sql: string) => {
        if (sql.includes('INSERT INTO payment_evidence_upload_operations')) return [];
        if (sql.includes('SELECT id, status, source_content_sha256')) return [operation];
        if (sql.includes('RETURNING id, status, source_content_sha256')) return [operation];
        return [];
      }),
    };
    const txManager = { query: jest.fn().mockResolvedValue([]) };
    const uow = { runInTransaction: jest.fn((work) => work({ manager: txManager })) };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo as never, fileStorage as never, manager as never, uow as never, { toWebp: jest.fn() } as never,
    );

    const result = await usecase.execute({
      saleOrderId: 'order-1', saleOrderPaymentId: 'payment-1', type: 'PAYMENT_PROOF',
      storageArea: 'private', file, idempotencyKey: '11111111-1111-4111-8111-111111111111',
    }, 'user-1');

    expect(result).toMatchObject({ url: operation.promoted_key });
    expect(fileStorage.save).not.toHaveBeenCalled();
    expect(fileStorage.move).not.toHaveBeenCalled();
    expect(txManager.query).toHaveBeenCalledWith(expect.stringContaining("SET status = 'COMPLETED'"), ['operation-1', expect.any(String)]);
    expect(attachmentRepo.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a concurrent retry while another worker holds the evidence-upload lease', async () => {
    const { UploadSaleOrderAttachmentUsecase } = await import('./upload-sale-order-attachment.usecase');
    const file = buildFile();
    const digest = createHash('sha256').update(file.buffer).digest('hex');
    const activeOperation = {
      id: 'operation-active', status: 'PREPARING', source_content_sha256: digest,
      prepared_content_sha256: digest, staging_key: null, promoted_key: null,
      quarantine_key: null, lease_until: new Date(Date.now() + 60_000),
    };
    const attachmentRepo = { findByUploadIdempotencyKey: jest.fn().mockResolvedValue(null) };
    const fileStorage = { save: jest.fn() };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => ({
        findOne: jest.fn().mockResolvedValue(entity.name === 'SaleOrderEntity'
          ? { id: 'order-1', isActive: true }
          : { id: 'payment-1', saleOrderId: 'order-1' }),
      })),
      query: jest.fn(async (sql: string) => sql.includes('SELECT id, status, source_content_sha256') ? [activeOperation] : []),
    };
    const uow = { runInTransaction: jest.fn() };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo as never, fileStorage as never, manager as never, uow as never, { toWebp: jest.fn() } as never,
    );

    const error = await usecase.execute({
      saleOrderId: 'order-1', saleOrderPaymentId: 'payment-1', type: 'PAYMENT_PROOF',
      file, idempotencyKey: '11111111-1111-4111-8111-111111111111',
    }, 'user-1').catch((value: unknown) => value);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({ code: 'PAYMENT_EVIDENCE_UPLOAD_IN_PROGRESS' });
    expect(fileStorage.save).not.toHaveBeenCalled();
    expect(uow.runInTransaction).not.toHaveBeenCalled();
  });

  it('deletes the newly saved file when transactional audit persistence fails', async () => {
    const { UploadSaleOrderAttachmentUsecase } = await import('./upload-sale-order-attachment.usecase');
    const filePath = 'private/sale-order-attachments/order-1/new-proof.webp';
    const attachmentRepo = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn((attachment) => Promise.resolve(attachment)),
      markDeleted: jest.fn(),
    };
    const fileStorage = {
      save: jest.fn().mockResolvedValue({ area: 'staging', key: 'staging/sale-order-attachments/order-1/new-proof.webp', filename: 'new-proof.webp', relativePath: 'staging/sale-order-attachments/order-1/new-proof.webp' }),
      read: jest.fn().mockResolvedValue(Buffer.from('image')),
      exists: jest.fn().mockResolvedValue(false),
      resolve: jest.fn((key: string) => ({ area: key.split('/')[0], key, filename: key.split('/').pop(), relativePath: key })),
      move: jest.fn().mockResolvedValue({ area: 'private', key: filePath, filename: 'new-proof.webp', relativePath: filePath }),
      delete: jest.fn().mockResolvedValue(true),
    };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => ({
        findOne: jest.fn().mockResolvedValue(
          entity.name === 'SaleOrderEntity'
            ? { id: 'order-1', isActive: true }
            : { id: 'payment-1', saleOrderId: 'order-1' },
        ),
      })),
    };
    const uow = { runInTransaction: jest.fn((work) => work({ tx: true })) };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo as never,
      fileStorage as never,
      manager as never,
      uow as never,
      { toWebp: jest.fn() } as never,
    );

    await expect(usecase.execute({
      saleOrderId: 'order-1',
      saleOrderPaymentId: 'payment-1',
      type: 'PAYMENT_PROOF',
      storageArea: 'private',
      file: buildFile(),
      onPersisted: async () => { throw new Error('audit insert failed'); },
    })).rejects.toThrow('audit insert failed');
    expect(fileStorage.delete).toHaveBeenCalledWith(filePath);
  });

  it('keeps PNG sale order images without converting them', async () => {
    expect(existsSync(`${usecasePath}.ts`)).toBe(true);
    if (!existsSync(`${usecasePath}.ts`)) return;

    const {
      UploadSaleOrderAttachmentUsecase,
    } = await import(usecasePath) as {
      UploadSaleOrderAttachmentUsecase: new (
        attachmentRepo: unknown,
        fileStorage: unknown,
        manager: unknown,
        uow: unknown,
        imageProcessor?: unknown,
      ) => {
        execute(input: unknown, userId?: string): Promise<unknown>;
      };
    };
    const attachmentRepo = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn((attachment) => Promise.resolve(attachment)),
      markDeleted: jest.fn(),
    };
    const fileStorage = {
      save: jest.fn().mockResolvedValue({
        filename: 'shipping_photo.png',
        relativePath: '/api/assets/sale-order-attachments/order-1/shipping_photo.png',
      }),
      delete: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ id: 'order-1', isActive: true }),
      }),
    };
    const uow = {
      runInTransaction: jest.fn((work) => work({ tx: true })),
    };
    const imageProcessor = { toWebp: jest.fn() };
    const usecase = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo,
      fileStorage,
      manager,
      uow,
      imageProcessor,
    );
    const png = buildFile();

    await usecase.execute(
      {
        saleOrderId: 'order-1',
        type: 'SHIPPING_PHOTO',
        file: png,
      },
      'user-1',
    );

    expect(imageProcessor.toWebp).not.toHaveBeenCalled();
    expect(fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      area: 'public',
      buffer: png.buffer,
      extension: 'png',
    }));
  });
});
