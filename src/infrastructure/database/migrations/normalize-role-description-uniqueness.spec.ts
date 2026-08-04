import { QueryRunner } from 'typeorm';
import { NormalizeRoleDescriptionUniqueness20260804020000 } from './20260804020000-normalize-role-description-uniqueness';

describe('NormalizeRoleDescriptionUniqueness20260804020000', () => {
  it('enforces accent-insensitive role uniqueness', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => queries.push(query)),
    } as unknown as QueryRunner;

    await new NormalizeRoleDescriptionUniqueness20260804020000().up(queryRunner);
    const sql = queries.join('\n');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION normalize_role_description');
    expect(sql).toContain('normalize_role_description(description)');
    expect(sql).toContain('CREATE UNIQUE INDEX ux_roles_description_normalized');
  });
});
