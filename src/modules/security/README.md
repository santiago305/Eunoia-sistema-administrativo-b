# Security Module

Modulo de seguridad IP para rate limit, bans progresivos y blacklist manual.

## Objetivo
- Identificar IP real desde `x-forwarded-for` (primer valor) o `req.ip`.
- Registrar violaciones cuando una IP supera el limite.
- Aplicar politica de reincidencia en ventana de 24h:
  - 1ra violacion: 15 minutos
  - 2da violacion: 1 hora
  - 3ra violacion: 24 horas
  - 4ta o mas: 7 dias
- Permitir blacklist manual permanente tras revision.
- Exponer datos para dashboard interno de seguridad.

## Estructura
- `application/use-cases/`
  - `resolve-client-ip.usecase.ts`
  - `check-ip-ban.usecase.ts`
  - `register-ip-violation-and-apply-policy.usecase.ts`
  - `manage-manual-ip-blacklist.usecase.ts`
  - `get-top-ips-security.usecase.ts`
  - `get-active-bans-security.usecase.ts`
  - `get-ip-history-security.usecase.ts`
  - `get-activity-series-security.usecase.ts`
  - `get-reason-distribution-security.usecase.ts`
  - `get-method-distribution-security.usecase.ts`
  - `get-top-routes-security.usecase.ts`
  - `get-risk-score-security.usecase.ts`
  - `get-risk-score-by-ip-security.usecase.ts`
  - `export-security-audit-csv.usecase.ts`
  - `get-security-reasons-catalog.usecase.ts`
  - `security-insights.utils.ts`
- `adapters/in/guards/`
  - `ip-ban.guard.ts` (bloquea requests baneadas antes de controladores)
  - `security-throttler.guard.ts` (registra violaciones al superar throttling)
- `adapters/in/controllers/security.controller.ts`
- `adapters/out/persistence/typeorm/entities/`
  - `ip-violation.entity.ts`
  - `ip-ban.entity.ts`
  - `security-reason-catalog.entity.ts`

## Tablas
- `security_ip_violations`
  - `ip`, `reason`, `path`, `method`, `user_agent`, `created_at`
- `security_ip_bans`
  - `ip`, `ban_level`, `banned_until`, `manual_permanent_ban`
  - `notes`, `created_by`, `reviewed_by`, `last_reason`, `created_at`, `updated_at`
- `security_reason_catalog`
  - `key`, `label`, `description`, `active`, `created_at`, `updated_at`

## Integracion global
- `IpBanGuard` y `SecurityThrottlerGuard` se registran como `APP_GUARD` en `AppModule`.
- `ThrottlerModule` mantiene el limite global actual (`120/min`).
- El storage del throttler es Redis (`RedisThrottlerStorage`), por lo que el contador se comparte entre instancias.

## Endpoints (admin)
Base: `/api/security`
- `GET /top-ips?hours=24&limit=20&reason=rate_limit_exceeded`
- `GET /active-bans`
- `GET /history/:ip?limit=100`
- `GET /activity-series?hours=24&groupBy=hour&reason=rate_limit_exceeded`
- `GET /reason-distribution?hours=24`
- `GET /reasons?hours=24&activeOnly=true`
- `GET /method-distribution?hours=24&reason=rate_limit_exceeded`
- `GET /top-routes?hours=24&limit=5&reason=rate_limit_exceeded`
- `GET /risk-score?hours=24`
- `GET /risk-score/ip?ip=203.0.113.55&hours=24`
- `GET /audit-export?hours=24&reason=rate_limit_exceeded`
- `PATCH /blacklist`
  - body: `{ "ip": "1.2.3.4", "notes": "motivo" }`
- `PATCH /blacklist/remove/:ip`

Todos estos endpoints requieren `JwtAuthGuard + RolesGuard` con rol `admin`.

## Contratos nuevos

### `GET /reasons`
- Query:
  - `hours` (number, opcional, default 24)
  - `activeOnly` (`true|false`, opcional, default `false`)
- Response JSON:
```json
{
  "from": "2026-03-11T18:00:00.000Z",
  "to": "2026-03-12T18:00:00.000Z",
  "generatedAt": "2026-03-12T18:00:00.000Z",
  "data": [
    { "key": "rate_limit_exceeded", "label": "Rate Limit Exceeded", "count": 120, "active": true },
    { "key": "temporary_ban_request", "label": "Temporary Ban Request", "count": 45, "active": true }
  ]
}
```

### `GET /risk-score/ip`
- Query:
  - `ip` (string, requerido)
  - `hours` (number, opcional, default 24, min 1, max 720)
- Response JSON:
```json
{
  "ip": "203.0.113.55",
  "score": 72,
  "level": "MEDIUM",
  "label": "Moderado",
  "windowHours": 24,
  "generatedAt": "2026-03-12T18:00:00.000Z",
  "details": {
    "from": "2026-03-11T18:00:00.000Z",
    "to": "2026-03-12T18:00:00.000Z",
    "timeZone": "America/Lima",
    "metrics": {
      "violations": 10,
      "distinctReasons": 3,
      "hasActiveBan": true,
      "isManualPermanentBan": false
    },
    "components": {
      "fromViolations": 30,
      "fromReasons": 12,
      "fromActiveBan": 12,
      "fromManualBan": 0
    }
  }
}
```

### `GET /audit-export`
- Query:
  - `hours` (number, opcional, default 24, min 1, max 720)
  - `reason` (string, opcional)
- Response:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename=security-audit-YYYY-MM-DD.csv`
  - CSV columnas: `createdAt, createdAtLocal, ip, reason, path, method, userAgent`

## Notas para frontend
- El selector de motivos debe consumir `/reasons`.
- El frontend debe enviar siempre `reason=<key_tecnico>` (no label).
- El filtro `reason` ahora se soporta en:
  - `/top-ips`
  - `/activity-series`
  - `/method-distribution`
  - `/top-routes`
- Si `reason` no se envia (o va vacio), se devuelve data sin filtro.
- Para descargar CSV en navegador:
  - usar `responseType: 'blob'` (axios) o `response.blob()` (fetch)
  - leer `Content-Disposition` para nombre de archivo sugerido.

## Variables de entorno
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_DB`
- `REDIS_TTL_MS`
