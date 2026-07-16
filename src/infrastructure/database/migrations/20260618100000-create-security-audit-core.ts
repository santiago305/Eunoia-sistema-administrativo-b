import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSecurityAuditCore20260618100000 implements MigrationInterface {
  name = "CreateSecurityAuditCore20260618100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS security_reason_catalog (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        key varchar(120) NOT NULL UNIQUE,
        label varchar(180) NOT NULL,
        description text,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS security_ip_violations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        ip varchar(80) NOT NULL,
        reason varchar(120) NOT NULL,
        path text,
        method varchar(20),
        user_agent text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS security_ip_bans (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        ip varchar(80) NOT NULL UNIQUE,
        ban_level int NOT NULL DEFAULT 1,
        banned_until timestamptz,
        manual_permanent_ban boolean NOT NULL DEFAULT false,
        notes text,
        created_by varchar(120),
        reviewed_by varchar(120),
        last_reason varchar(120),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_security_ip_violations_ip_created ON security_ip_violations(ip, created_at DESC);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_security_ip_violations_reason ON security_ip_violations(reason);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_security_ip_bans_ip_unique ON security_ip_bans(ip);`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}
