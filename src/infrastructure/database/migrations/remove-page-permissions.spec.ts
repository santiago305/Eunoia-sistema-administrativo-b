import { QueryRunner } from 'typeorm';
import { RemoveOutOrdersPagePermission20260620000000 } from './20260620000000-remove-out-orders-page-permission';
import { RemoveProfileSessionsPagePermissions20260529000000 } from './20260529000000-remove-profile-sessions-page-permissions';

describe('page permission removal migrations', () => {
  it.each([
    new RemoveProfileSessionsPagePermissions20260529000000(),
    new RemoveOutOrdersPagePermission20260620000000(),
  ])('guards optional access-control tables in %s', async (migration) => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;

    await migration.up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain("to_regclass('public.permissions')");
    expect(sql).toContain("to_regclass('public.user_permission_overrides')");
    expect(sql).toContain("to_regclass('public.user_grantable_permissions')");
    expect(sql).toContain("to_regclass('public.role_permissions')");
  });
});
