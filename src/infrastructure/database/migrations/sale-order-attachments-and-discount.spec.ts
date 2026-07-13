import { existsSync } from 'fs';
import { join } from 'path';

describe('CreateSaleOrderAttachmentsAndDiscount20260704000000', () => {
  it('defines the complete reversible attachment and discount migration', async () => {
    const migrationPath = join(
      __dirname,
      '20260704000000-create-sale-order-attachments-and-discount',
    );
    const sourcePath = `${migrationPath}.ts`;

    expect(existsSync(sourcePath)).toBe(true);
    if (!existsSync(sourcePath)) return;

    const {
      CreateSaleOrderAttachmentsAndDiscount20260704000000,
    } = require(migrationPath) as {
      CreateSaleOrderAttachmentsAndDiscount20260704000000: new () => {
        up(queryRunner: unknown): Promise<void>;
        down(queryRunner: unknown): Promise<void>;
      };
    };
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };
    const migration =
      new CreateSaleOrderAttachmentsAndDiscount20260704000000();

    await migration.up(queryRunner as never);
    const upSql = queries.join('\n');

    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS discount numeric');
    expect(upSql).toContain(
      'CREATE TABLE IF NOT EXISTS sale_order_attachments',
    );
    expect(upSql).toContain('sale_order_payment_id uuid');
    expect(upSql).toContain('SHIPPING_PHOTO');
    expect(upSql).toContain('PAYMENT_PROOF');
    expect(upSql).toContain('WHERE deleted_at IS NULL');
    expect(upSql).toContain('send_photo');
    expect(upSql).toContain('payment_photo');
    expect(upSql).toContain(
      'FOREIGN KEY (sale_order_payment_id) REFERENCES sale_payments(id)',
    );
    expect(upSql).toContain(
      'FOREIGN KEY (uploaded_by_user_id) REFERENCES users(user_id)',
    );
    expect(upSql).not.toContain('REFERENCES users(id)');
    expect(upSql).toContain('ON DELETE SET NULL');

    queries.length = 0;
    await migration.down(queryRunner as never);
    const downSql = queries.join('\n');

    expect(downSql).toContain('DROP TABLE IF EXISTS sale_order_attachments');
    expect(downSql).toContain('DROP COLUMN IF EXISTS discount');
  });
});
