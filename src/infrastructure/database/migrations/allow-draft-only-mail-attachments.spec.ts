import { QueryRunner } from 'typeorm';
import { databaseMigrations } from '../typeorm.config';

describe('AllowDraftOnlyMailAttachments20260824120000', () => {
  it('is registered and allows draft attachments without a message id', async () => {
    const Migration = databaseMigrations.find(
      (candidate) =>
        candidate.name === 'AllowDraftOnlyMailAttachments20260824120000',
    );

    expect(Migration).toBeDefined();
    if (!Migration) return;

    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    } as unknown as QueryRunner;

    await new Migration().up(queryRunner);

    expect(queries.join('\n')).toContain(
      'ALTER TABLE message_attachments ALTER COLUMN message_id DROP NOT NULL',
    );
  });
});
