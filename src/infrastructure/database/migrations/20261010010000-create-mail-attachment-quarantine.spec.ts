import { QueryRunner } from 'typeorm';
import { CreateMailAttachmentQuarantine20261010010000 } from './20261010010000-create-mail-attachment-quarantine';

describe('CreateMailAttachmentQuarantine20261010010000', () => {
  it('creates a recoverable quarantine manifest table', async () => {
    const queries: string[] = [];
    const queryRunner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as unknown as QueryRunner;

    await new CreateMailAttachmentQuarantine20261010010000().up(queryRunner);
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS mail_attachment_quarantines');
    expect(sql).toContain("'CANDIDATE', 'QUARANTINED', 'RESTORED', 'PURGED'");
    expect(sql).toContain('quarantine_key varchar(500)');
  });
});
