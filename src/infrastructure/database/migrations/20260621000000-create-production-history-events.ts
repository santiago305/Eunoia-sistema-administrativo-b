import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProductionHistoryEvents20260621000000 implements MigrationInterface {
  name = "CreateProductionHistoryEvents20260621000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS production_history_events (
        production_history_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        production_id uuid NOT NULL,
        event_type varchar(120) NOT NULL,
        description text NOT NULL,
        old_values jsonb NULL,
        new_values jsonb NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        performed_by_user_id uuid NULL,
        target_user_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_production_history_events_production'
        ) THEN
          ALTER TABLE production_history_events
          ADD CONSTRAINT fk_production_history_events_production
          FOREIGN KEY (production_id)
          REFERENCES production_orders(production_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_production_history_events_performed_by_user'
        ) THEN
          ALTER TABLE production_history_events
          ADD CONSTRAINT fk_production_history_events_performed_by_user
          FOREIGN KEY (performed_by_user_id)
          REFERENCES users(user_id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_production_history_events_target_user'
        ) THEN
          ALTER TABLE production_history_events
          ADD CONSTRAINT fk_production_history_events_target_user
          FOREIGN KEY (target_user_id)
          REFERENCES users(user_id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_production_history_events_production
      ON production_history_events(production_id, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_production_history_events_event_type
      ON production_history_events(event_type);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_production_history_events_performed_by
      ON production_history_events(performed_by_user_id);
    `);
  }

  public async down(): Promise<void> {
    // No-op para conservar trazabilidad de produccion.
  }
}
