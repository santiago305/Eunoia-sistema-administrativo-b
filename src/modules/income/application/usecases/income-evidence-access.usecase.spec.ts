import { createHash } from 'node:crypto';
import { IncomeEvidenceAccessUsecase } from './income-evidence-access.usecase';

describe('IncomeEvidenceAccessUsecase', () => {
  it('stores only revision metadata and a digest after content is successfully read', async () => {
    const entityManager = { query: jest.fn().mockResolvedValue(undefined) };
    const usecase = new IncomeEvidenceAccessUsecase(entityManager as any);
    const content = Buffer.from('private-evidence');

    await usecase.record({
      incomeId: 'income-1', saleOrderId: 'order-1', attachmentId: 'attachment-1',
      userId: 'user-1', inherited: false, content,
    });

    expect(entityManager.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO payment_evidence_access_logs'), [
      'income-1', 'order-1', 'attachment-1', 'user-1', false,
      createHash('sha256').update(content).digest('hex'), content.byteLength,
    ]);
    expect(entityManager.query.mock.calls[0][1]).not.toContain(content);
  });

  it('lists bounded access metadata without exposing a storage key or binary', async () => {
    const entityManager = { query: jest.fn().mockResolvedValue([{
      id: 'log-1', actor_user_id: 'user-1', evidence_attachment_id: null,
      inherited: true, content_sha256: 'a'.repeat(64), size_bytes: '12', accessed_at: new Date('2026-10-13T12:00:00Z'),
    }]) };
    const usecase = new IncomeEvidenceAccessUsecase(entityManager as any);

    await expect(usecase.list('income-1', 20)).resolves.toEqual([expect.objectContaining({
      id: 'log-1', actorUserId: 'user-1', attachmentId: null, inherited: true,
      contentSha256: 'a'.repeat(64), sizeBytes: 12,
    })]);
    expect(entityManager.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $2'), ['income-1', 20]);
  });
});
