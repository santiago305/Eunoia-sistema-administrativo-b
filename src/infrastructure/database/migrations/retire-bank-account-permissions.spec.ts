import { RetireBankAccountPermissions20260921200000 } from './20260921200000-retire-bank-account-permissions';

describe('RetireBankAccountPermissions20260921200000', () => {
  it('migrates grants before deleting legacy bank account permissions', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new RetireBankAccountPermissions20260921200000();

    await migration.up({ query } as never);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain("('bank-accounts.read', 'payment_accounts.view')");
    expect(sql).toContain("('bank-accounts.manage', 'payment_accounts.create')");
    expect(sql).toContain('INSERT INTO role_permissions');
    expect(sql).toContain('INSERT INTO user_permission_overrides');
    expect(sql).toContain('SELECT DISTINCT ON (mapped.user_id, mapped.permission_id)');
    expect(sql).toContain("CASE WHEN mapped.effect = 'DENY' THEN 0 ELSE 1 END");
    expect(sql).toContain('INSERT INTO user_grantable_permissions');
    expect(sql).toContain("WHERE code IN ('bank-accounts.read', 'bank-accounts.manage')");
  });
});
