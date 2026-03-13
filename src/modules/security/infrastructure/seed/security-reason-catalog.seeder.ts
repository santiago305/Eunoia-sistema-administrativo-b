import { DataSource } from 'typeorm';
import { SecurityReasonCatalog } from '../../adapters/out/persistence/typeorm/entities/security-reason-catalog.entity';

const BASE_REASONS: Array<Pick<SecurityReasonCatalog, 'key' | 'label' | 'description' | 'active'>> = [
  {
    key: 'rate_limit_exceeded',
    label: 'Rate Limit Exceeded',
    description: 'Limite de requests excedido por throttling',
    active: true,
  },
  {
    key: 'temporary_ban_request',
    label: 'Temporary Ban Request',
    description: 'Solicitud de baneo temporal por reincidencia',
    active: true,
  },
  {
    key: 'manual_permanent_ban_request',
    label: 'Manual Permanent Ban Request',
    description: 'Intento de acceso mientras la IP esta en blacklist permanente',
    active: true,
  },
  {
    key: 'manual_permanent_ban',
    label: 'Manual Permanent Ban',
    description: 'Bloqueo permanente aplicado manualmente',
    active: true,
  },
  {
    key: 'manual_unban',
    label: 'Manual Unban',
    description: 'Retiro manual de blacklist permanente',
    active: true,
  },
  {
    key: 'ip_ban_guard_block',
    label: 'IP Ban Guard Block',
    description: 'Request bloqueado por guard de baneo IP',
    active: true,
  },
  {
    key: 'suspicious_user_agent',
    label: 'Suspicious User Agent',
    description: 'User-Agent anomalo, vacio o no confiable',
    active: true,
  },
  {
    key: 'high_frequency_same_route',
    label: 'High Frequency Same Route',
    description: 'Alta frecuencia sobre una misma ruta',
    active: true,
  },
  {
    key: 'burst_multi_route_scan',
    label: 'Burst Multi Route Scan',
    description: 'Patron tipo escaneo rapido de multiples rutas',
    active: true,
  },
  {
    key: 'auth_bruteforce_suspected',
    label: 'Auth Bruteforce Suspected',
    description: 'Patron sospechoso de fuerza bruta en autenticacion',
    active: true,
  },
  {
    key: 'token_abuse_suspected',
    label: 'Token Abuse Suspected',
    description: 'Uso anomalo o abusivo de token/sesion',
    active: true,
  },
  {
    key: 'invalid_csrf_repeated',
    label: 'Invalid CSRF Repeated',
    description: 'Fallas repetidas de validacion CSRF',
    active: true,
  },
  {
    key: 'geo_anomaly_detected',
    label: 'Geo Anomaly Detected',
    description: 'Anomalia detectada por comportamiento geografico',
    active: true,
  },
  {
    key: 'known_bad_ip_match',
    label: 'Known Bad IP Match',
    description: 'IP detectada en listas de reputacion negativa',
    active: true,
  },
];

export const seedSecurityReasonCatalog = async (dataSource: DataSource): Promise<void> => {
  const repo = dataSource.getRepository(SecurityReasonCatalog);

  for (const reason of BASE_REASONS) {
    const existing = await repo.findOne({ where: { key: reason.key } });
    if (!existing) {
      await repo.save(repo.create(reason));
      continue;
    }

    const needsUpdate =
      existing.label !== reason.label ||
      (existing.description ?? null) !== (reason.description ?? null) ||
      existing.active !== reason.active;

    if (needsUpdate) {
      existing.label = reason.label;
      existing.description = reason.description ?? null;
      existing.active = reason.active;
      await repo.save(existing);
    }
  }
};

