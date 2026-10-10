import { QueryRunner } from 'typeorm';
import { CreateMailAttachmentOperations20261010000000 } from './20261010000000-create-mail-attachment-operations';

describe('CreateMailAttachmentOperations20261010000000', () => {
  it('creates durable operation states and idempotency index', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    } as unknown as QueryRunner;

    await new CreateMailAttachmentOperations20261010000000().up(queryRunner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS mail_attachment_operations');
    expect(sql).toContain("'PENDING', 'STAGED', 'REGISTERED', 'ACTIVE', 'FAILED'");
    expect(sql).toContain('uq_mail_attachment_operations_idempotency');
    expect(sql).toContain('expected_size_bytes bigint');
  });
});
