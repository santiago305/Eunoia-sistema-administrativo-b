import { DataSource } from 'typeorm';
import { SecurityReasonCatalog } from '../../adapters/out/persistence/typeorm/entities/security-reason-catalog.entity';

const BASE_REASONS: Array<Pick<SecurityReasonCatalog, 'key' | 'label' | 'description' | 'active'>> = [
  {
    key: 'rate_limit_exceeded',
    label: 'Límite de solicitudes superado',
    description: 'La petición que alcanzó por primera vez el límite configurado durante la ventana actual.',
    active: true,
  },
  {
    key: 'rate_limit_blocked_request',
    label: 'Petición rechazada durante un límite activo',
    description: 'La solicitud llegó mientras el límite temporal ya estaba activo; queda auditada, pero no aumenta el nivel del bloqueo.',
    active: true,
  },
  {
    key: 'operator_rate_limit_exceeded',
    label: 'Límite del operador superado',
    description: 'La sesión autenticada alcanzó su límite operativo. Solo se limita esa sesión y no aumenta la reincidencia de la IP compartida.',
    active: true,
  },
  {
    key: 'operator_rate_limit_blocked_request',
    label: 'Petición del operador rechazada durante un límite activo',
    description: 'La sesión ya estaba limitada temporalmente; el evento se conserva solo para auditoría.',
    active: true,
  },
  {
    key: 'temporary_ban_request',
    label: 'Petición rechazada por bloqueo temporal',
    description: 'La IP intentó acceder mientras tenía un bloqueo temporal vigente; este evento no aumenta ni extiende el bloqueo.',
    active: true,
  },
  {
    key: 'manual_permanent_ban_request',
    label: 'Petición rechazada por bloqueo permanente',
    description: 'Intento de acceso mientras la IP esta en blacklist permanente',
    active: true,
  },
  {
    key: 'manual_permanent_ban',
    label: 'Bloqueo permanente aplicado manualmente',
    description: 'Bloqueo permanente aplicado manualmente',
    active: true,
  },
  {
    key: 'manual_unban',
    label: 'Desbloqueo manual',
    description: 'Un administrador retiró el bloqueo y reinició la reincidencia de la política automática',
    active: true,
  },
  {
    key: 'ip_ban_guard_block',
    label: 'Petición detenida por protección de IP',
    description: 'Request bloqueado por guard de baneo IP',
    active: true,
  },
  {
    key: 'suspicious_user_agent',
    label: 'Navegador o cliente sospechoso',
    description: 'User-Agent anomalo, vacio o no confiable',
    active: true,
  },
  {
    key: 'high_frequency_same_route',
    label: 'Alta frecuencia en una misma ruta',
    description: 'Alta frecuencia sobre una misma ruta',
    active: true,
  },
  {
    key: 'burst_multi_route_scan',
    label: 'Ráfaga sobre múltiples rutas',
    description: 'Patron tipo escaneo rapido de multiples rutas',
    active: true,
  },
  {
    key: 'auth_bruteforce_suspected',
    label: 'Posible fuerza bruta de autenticación',
    description: 'Patron sospechoso de fuerza bruta en autenticacion',
    active: true,
  },
  {
    key: 'token_abuse_suspected',
    label: 'Posible abuso de sesión',
    description: 'Uso anomalo o abusivo de token/sesion',
    active: true,
  },
  {
    key: 'invalid_csrf_repeated',
    label: 'Fallos repetidos de seguridad CSRF',
    description: 'Fallas repetidas de validacion CSRF',
    active: true,
  },
  {
    key: 'geo_anomaly_detected',
    label: 'Anomalía geográfica detectada',
    description: 'Anomalia detectada por comportamiento geografico',
    active: true,
  },
  {
    key: 'known_bad_ip_match',
    label: 'IP con reputación negativa',
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
