import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandSecurityRateLimitAudit20260902000000
  implements MigrationInterface
{
  name = 'ExpandSecurityRateLimitAudit20260902000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE security_ip_violations
        ADD COLUMN IF NOT EXISTS request_id varchar(120),
        ADD COLUMN IF NOT EXISTS actor varchar(120),
        ADD COLUMN IF NOT EXISTS throttler_name varchar(120),
        ADD COLUMN IF NOT EXISTS tracker_type varchar(20),
        ADD COLUMN IF NOT EXISTS tracker_key_hash varchar(64),
        ADD COLUMN IF NOT EXISTS user_id varchar(120),
        ADD COLUMN IF NOT EXISTS session_id varchar(120),
        ADD COLUMN IF NOT EXISTS total_hits int,
        ADD COLUMN IF NOT EXISTS request_limit int,
        ADD COLUMN IF NOT EXISTS window_seconds int,
        ADD COLUMN IF NOT EXISTS retry_after_seconds int,
        ADD COLUMN IF NOT EXISTS counted_for_ban boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS ban_level_after int,
        ADD COLUMN IF NOT EXISTS banned_until_after timestamptz;
    `);

    await queryRunner.query(`
      ALTER TABLE security_ip_bans
        ADD COLUMN IF NOT EXISTS policy_reset_at timestamptz;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_ip_violations_reason_created
      ON security_ip_violations(reason, created_at DESC);
    `);

    await queryRunner.query(`
      INSERT INTO security_reason_catalog (key, label, description, active)
      VALUES
        ('rate_limit_exceeded', 'Límite de solicitudes superado', 'La petición que alcanzó por primera vez el límite configurado durante la ventana actual.', true),
        ('rate_limit_blocked_request', 'Petición rechazada durante un límite activo', 'La solicitud llegó mientras el límite temporal ya estaba activo; queda auditada, pero no aumenta el nivel del bloqueo.', true),
        ('operator_rate_limit_exceeded', 'Límite del operador superado', 'La sesión autenticada alcanzó su límite operativo. Solo se limita esa sesión y no aumenta la reincidencia de la IP compartida.', true),
        ('operator_rate_limit_blocked_request', 'Petición del operador rechazada durante un límite activo', 'La sesión ya estaba limitada temporalmente; el evento se conserva solo para auditoría.', true),
        ('temporary_ban_request', 'Petición rechazada por bloqueo temporal', 'La IP intentó acceder mientras tenía un bloqueo temporal vigente; este evento no aumenta ni extiende el bloqueo.', true),
        ('manual_permanent_ban_request', 'Petición rechazada por bloqueo permanente', 'La IP intentó acceder mientras tenía un bloqueo permanente vigente.', true),
        ('manual_permanent_ban', 'Bloqueo permanente aplicado manualmente', 'Un administrador aplicó un bloqueo permanente.', true),
        ('manual_unban', 'Desbloqueo manual', 'Un administrador retiró el bloqueo y reinició la reincidencia de la política automática.', true),
        ('ip_ban_guard_block', 'Petición detenida por protección de IP', 'La solicitud fue detenida por la protección de direcciones IP.', true),
        ('suspicious_user_agent', 'Navegador o cliente sospechoso', 'Se detectó un identificador de navegador anómalo, vacío o no confiable.', true),
        ('high_frequency_same_route', 'Alta frecuencia en una misma ruta', 'Se detectaron demasiadas solicitudes sobre una misma operación.', true),
        ('burst_multi_route_scan', 'Ráfaga sobre múltiples rutas', 'Se detectó un patrón rápido de solicitudes sobre varias operaciones.', true),
        ('auth_bruteforce_suspected', 'Posible fuerza bruta de autenticación', 'Se detectaron intentos repetidos de autenticación.', true),
        ('token_abuse_suspected', 'Posible abuso de sesión', 'Se detectó un uso anómalo de un token o una sesión.', true),
        ('invalid_csrf_repeated', 'Fallos repetidos de seguridad CSRF', 'Se detectaron fallos repetidos al validar la protección CSRF.', true),
        ('geo_anomaly_detected', 'Anomalía geográfica detectada', 'Se detectó un cambio geográfico anómalo.', true),
        ('known_bad_ip_match', 'IP con reputación negativa', 'La dirección IP coincide con una fuente de reputación negativa.', true)
      ON CONFLICT (key) DO UPDATE SET
        label = EXCLUDED.label,
        description = EXCLUDED.description,
        active = EXCLUDED.active,
        updated_at = now();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_ip_violations_reason_created;`);
    await queryRunner.query(`
      ALTER TABLE security_ip_bans
        DROP COLUMN IF EXISTS policy_reset_at;
    `);
    await queryRunner.query(`
      ALTER TABLE security_ip_violations
        DROP COLUMN IF EXISTS banned_until_after,
        DROP COLUMN IF EXISTS ban_level_after,
        DROP COLUMN IF EXISTS counted_for_ban,
        DROP COLUMN IF EXISTS retry_after_seconds,
        DROP COLUMN IF EXISTS window_seconds,
        DROP COLUMN IF EXISTS request_limit,
        DROP COLUMN IF EXISTS total_hits,
        DROP COLUMN IF EXISTS throttler_name,
        DROP COLUMN IF EXISTS session_id,
        DROP COLUMN IF EXISTS user_id,
        DROP COLUMN IF EXISTS tracker_key_hash,
        DROP COLUMN IF EXISTS tracker_type,
        DROP COLUMN IF EXISTS actor,
        DROP COLUMN IF EXISTS request_id;
    `);
  }
}
