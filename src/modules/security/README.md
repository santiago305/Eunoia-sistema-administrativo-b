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
  - `get-ip-security-insights.usecase.ts`
- `adapters/in/guards/`
  - `ip-ban.guard.ts` (bloquea requests baneadas antes de controladores)
  - `security-throttler.guard.ts` (registra violaciones al superar throttling)
- `adapters/in/controllers/security.controller.ts`
- `adapters/out/persistence/typeorm/entities/`
  - `ip-violation.entity.ts`
  - `ip-ban.entity.ts`

## Tablas
- `security_ip_violations`
  - `ip`, `reason`, `path`, `method`, `user_agent`, `created_at`
- `security_ip_bans`
  - `ip`, `ban_level`, `banned_until`, `manual_permanent_ban`
  - `notes`, `created_by`, `reviewed_by`, `last_reason`, `created_at`, `updated_at`

## Integracion global
- `IpBanGuard` y `SecurityThrottlerGuard` se registran como `APP_GUARD` en `AppModule`.
- `ThrottlerModule` mantiene el limite global actual (`120/min`).
- El storage del throttler es Redis (`RedisThrottlerStorage`), por lo que el contador se comparte entre instancias.

## Endpoints (admin)
Base: `/api/security`
- `GET /top-ips?hours=24&limit=20`
- `GET /active-bans`
- `GET /history/:ip?limit=100`
- `GET /activity-series?hours=24&groupBy=hour`
- `GET /reason-distribution?hours=24`
- `GET /method-distribution?hours=24`
- `GET /top-routes?hours=24&limit=5`
- `GET /risk-score?hours=24`
- `PATCH /blacklist`
  - body: `{ "ip": "1.2.3.4", "notes": "motivo" }`
- `PATCH /blacklist/remove/:ip`

Todos estos endpoints requieren `JwtAuthGuard + RolesGuard` con rol `admin`.

## Variables de entorno
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_DB`
- `REDIS_TTL_MS`
