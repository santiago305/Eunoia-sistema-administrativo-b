import { AddSaleOrderPreparedPreguide20260725000000 } from './20260725000000-add-sale-order-prepared-preguide';
import { databaseMigrations } from '../typeorm.config';

describe('AddSaleOrderPreparedPreguide20260725000000', () => {
  it('is registered in the TypeORM migration list', () => {
    expect(databaseMigrations).toContain(AddSaleOrderPreparedPreguide20260725000000);
  });

  it('adds nullable prepared and preguide columns with false defaults', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };
    const migration = new AddSaleOrderPreparedPreguide20260725000000();

    await migration.up(queryRunner as never);
    const upSql = queries.join('\n');

    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS prepared boolean DEFAULT false');
    expect(upSql).toContain('ADD COLUMN IF NOT EXISTS preguide boolean DEFAULT false');
    expect(upSql).not.toContain('prepared boolean NOT NULL');
    expect(upSql).not.toContain('preguide boolean NOT NULL');

    queries.length = 0;
    await migration.down(queryRunner as never);
    const downSql = queries.join('\n');

    expect(downSql).toContain('DROP COLUMN IF EXISTS prepared');
    expect(downSql).toContain('DROP COLUMN IF EXISTS preguide');
  });
});
