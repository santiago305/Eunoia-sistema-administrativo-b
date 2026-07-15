import { CreateProductionAttachments20260715090000 } from './20260715090000-create-production-attachments';

describe('CreateProductionAttachments20260715090000', () => {
  it('creates production attachments and migrates legacy image_prodution values', async () => {
    const queryRunner = { query: jest.fn() };

    await new CreateProductionAttachments20260715090000().up(
      queryRunner as any,
    );

    const sql = queryRunner.query.mock.calls.map(([query]) => query).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS production_attachments');
    expect(sql).toContain('jsonb_array_elements_text');
    expect(sql).toContain('po.image_prodution');
  });
});

