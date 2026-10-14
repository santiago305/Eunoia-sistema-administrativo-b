import { ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { FileStorage } from 'src/shared/application/ports/file-storage.port';
import { IncomeEvidenceQuarantineUsecase } from './income-evidence-quarantine.usecase';

const operationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const incomeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const orderId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const userId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const adminId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const bytes = Buffer.from('verified-prepared-image');
const digest = createHash('sha256').update(bytes).digest('hex');
const quarantineKey = `quarantine/payment-evidence/${operationId}/proof.webp`;
const privateKey = `private/sale-order-attachments/${orderId}/${operationId}.webp`;

const operation = {
  id: operationId, sale_order_payment_id: incomeId, sale_order_id: orderId,
  uploaded_by_user_id: userId, idempotency_key: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  source_content_sha256: 'source-digest-can-differ-after-image-preparation',
  prepared_content_sha256: digest, original_name: 'proof.webp', mime_type: 'image/webp',
  size_bytes: bytes.length, quarantine_key: quarantineKey, last_error: 'INTEGRITY_CHECK_FAILED', status: 'QUARANTINED',
  attempts: 1, created_at: new Date(), updated_at: new Date(),
};

describe('IncomeEvidenceQuarantineUsecase', () => {
  let usecase: IncomeEvidenceQuarantineUsecase;
  let manager: { query: jest.Mock; transaction: jest.Mock };
  let storage: FileStorage & { read: jest.Mock; exists: jest.Mock; save: jest.Mock; resolve: jest.Mock };
  let emitToAllConnected: jest.Mock;

  beforeEach(() => {
    manager = { query: jest.fn(), transaction: jest.fn() };
    emitToAllConnected = jest.fn();
    manager.transaction.mockImplementation((callback) => callback(manager));
    manager.query.mockImplementation((sql: string) => {
      if (sql.includes('FROM payment_evidence_upload_operations')) return [operation];
      if (sql.includes('FROM sale_payments payment')) return [{ status: 'PENDING_CONFIRMATION', is_active: true }];
      if (sql.includes('FROM sale_order_attachments')) return [];
      if (sql.includes('INSERT INTO sale_order_attachments')) return [{ id: '11111111-1111-4111-8111-111111111111' }];
      return [];
    });
    storage = {
      read: jest.fn().mockImplementation((key: string) => Promise.resolve(key === quarantineKey || key === privateKey ? bytes : null)),
      exists: jest.fn().mockImplementation((key: string) => Promise.resolve(key === quarantineKey)),
      save: jest.fn().mockResolvedValue({ area: 'private', key: privateKey, filename: `${operationId}.webp`, relativePath: privateKey, publicUrl: null, absolutePath: '/private/proof' }),
      resolve: jest.fn().mockImplementation((key: string) => ({ area: key.split('/')[0], key, filename: key.split('/').pop(), relativePath: key, publicUrl: null, absolutePath: key })),
      delete: jest.fn(), moveToDeleted: jest.fn(),
    };
    usecase = new IncomeEvidenceQuarantineUsecase(manager as unknown as EntityManager, storage, { emitToAllConnected } as never);
  });

  it('recupera evidencia íntegra con motivo y registra actor/auditoría sin borrar cuarentena', async () => {
    await expect(usecase.recover(incomeId, operationId, adminId, 'Carga válida, falso positivo')).resolves.toEqual({
      operationId, incomeId, attachmentId: '11111111-1111-4111-8111-111111111111', status: 'COMPLETED',
    });
    expect(storage.save).toHaveBeenCalledWith(expect.objectContaining({ area: 'private', directory: `sale-order-attachments/${orderId}`, buffer: bytes }));
    expect(storage.delete).not.toHaveBeenCalled();
    expect(emitToAllConnected).toHaveBeenCalledTimes(2);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('payment_evidence_quarantine_recovered'), [orderId, adminId]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('recovered_by_user_id = $3'), [operationId, expect.any(String), adminId, 'Carga válida, falso positivo']);
  });

  it('rechaza hash inválido y conserva el archivo sin crear evidencia', async () => {
    storage.read.mockResolvedValue(Buffer.from('tampered'));
    await expect(usecase.recover(incomeId, operationId, adminId, 'Validación de evidencia')).rejects.toBeInstanceOf(ConflictException);
    expect(storage.save).not.toHaveBeenCalled();
    expect(manager.transaction).not.toHaveBeenCalled();
    expect(emitToAllConnected).not.toHaveBeenCalled();
  });

  it('rechaza si el pago dejó de estar pendiente o el pedido no está activo', async () => {
    manager.query.mockImplementation((sql: string) => {
      if (sql.includes('FROM payment_evidence_upload_operations')) return [operation];
      if (sql.includes('FROM sale_payments payment')) return [{ status: 'POSTED', is_active: true }];
      return [];
    });
    await expect(usecase.recover(incomeId, operationId, adminId, 'Recuperación solicitada')).rejects.toBeInstanceOf(ConflictException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('requiere motivo operativo no vacío', async () => {
    await expect(usecase.recover(incomeId, operationId, adminId, '  ')).rejects.toBeInstanceOf(ConflictException);
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('devuelve el resultado original al reintentar exactamente la misma recuperación', async () => {
    manager.query.mockResolvedValue([{ ...operation, status: 'COMPLETED', attachment_id: '11111111-1111-4111-8111-111111111111', recovered_by_user_id: adminId, recovery_reason: 'Mismo motivo de auditoría' }]);
    await expect(usecase.recover(incomeId, operationId, adminId, 'Mismo motivo de auditoría')).resolves.toEqual({
      operationId, incomeId, attachmentId: '11111111-1111-4111-8111-111111111111', status: 'COMPLETED',
    });
    expect(storage.read).not.toHaveBeenCalled();
    expect(manager.transaction).not.toHaveBeenCalled();
  });
});
