import { QueryRunner } from 'typeorm';
import { CreateDeletedMailArchiveOperations20261010020000 } from './20261010020000-create-deleted-mail-archive-operations';

describe('CreateDeletedMailArchiveOperations20261010020000', () => {
  it('creates an idempotent per-attachment archive operation log', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    } as unknown as QueryRunner;

    await new CreateDeletedMailArchiveOperations20261010020000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('deleted_mail_archive_operations');
    expect(sql).toContain('source_attachment_id uuid NOT NULL');
    expect(sql).toContain("'PENDING', 'MOVED', 'VERIFIED', 'COMMITTED', 'FAILED'");
    expect(sql).toContain('uq_deleted_mail_archive_operation_attachment');
  });
});
