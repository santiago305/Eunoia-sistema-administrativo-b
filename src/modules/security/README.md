# Security Module

Modulo de seguridad IP para rate limit, bans progresivos y blacklist manual.

## Objetivo
- Identificar la sesion y el usuario desde un JWT firmado; nunca desde un
  identificador libre enviado por el cliente.
- Usar la IP real como proteccion secundaria y como respaldo para rutas sin
  sesion, resolviendola desde el proxy confiable o `req.ip`.
- Registrar excesos tanto de sesion como de IP con su causa exacta.
- Aplicar politica de reincidencia en ventana de 24h. Los dos primeros excesos
  quedan advertidos; desde el tercero se aplican niveles de 15 minutos, 1 hora,
  24 horas y 7 dias.
- Permitir blacklist manual permanente tras revision.
- Exponer datos para dashboard interno de seguridad.

## Estructura
- `application/use-cases/`
  - `resolve-client-ip.usecase.ts`
  - `resolve-rate-limit-tracker.usecase.ts`
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
- `ThrottlerModule` mantiene el limite global (`120/min`) y define una politica
  secundaria por IP (`600/min`). Ambos limites son por operacion/ruta: el
  primero usa la sesion autenticada y el segundo la IP publica compartida.
- `/inventory/stream` reemplaza el limite principal por `20 aperturas/min` por
  sesion, pero conserva la barrera secundaria por IP.
- `/auth/login`, al no tener todavia sesion, conserva su limite especifico de
  `5 intentos/min` por combinacion IP + cuenta. La cuenta se normaliza y se usa
  solo como hash, de modo que varios empleados de la misma red pueden iniciar
  sesion sin compartir esos cinco intentos.
- `/auth/refresh` usa la identidad firmada del refresh token cuando el access
  token ya expiro, por lo que tampoco comparte el contador operativo de la IP.
- El storage del throttler es Redis (`RedisThrottlerStorage`), por lo que el contador se comparte entre instancias.
- Cada 429 registra un evento JSON con IP, método, ruta, hits, límite y nivel de bloqueo; las respuestas exitosas registran `http_request_completed`.
- Solo la primera respuesta del bloqueo Redis se registra como
  `rate_limit_exceeded` y aumenta la reincidencia. Las solicitudes que llegan
  mientras ese limite ya esta activo se guardan como
  `rate_limit_blocked_request`, exclusivamente para auditoria.
- Los excesos del contador de sesion se registran como
  `operator_rate_limit_exceeded` y
  `operator_rate_limit_blocked_request`. Ninguno aumenta la reincidencia ni
  bloquea la IP de los demas operadores.
- La auditoria persistente conserva ID de peticion, politica, solicitudes,
  limite, ventana, tiempo de reintento, tipo de contador, usuario, sesion y
  nivel resultante. La clave completa del contador no se guarda: solo su hash.
- Al retirar un bloqueo manualmente se limpian los contadores Redis de esa IP y
  tambien los contadores de login asociados; se inicia una nueva ventana de
  reincidencia sin eliminar el historial.
- `/health` usa `SkipThrottle` para que los healthchecks no consuman el presupuesto ni generen violaciones.
- Con `TRUST_PROXY=true`, Express resuelve `req.ip` desde el proxy de confianza; sin esa opción se usa la dirección del socket para evitar confiar en cabeceras enviadas por el cliente.
- En produccion detras de un proxy confiable, `TRUST_PROXY` debe estar activo.
  De lo contrario todos los usuarios pueden aparecer con la IP interna del
  proxy y compartir el mismo limite.
- Aunque `TRUST_PROXY` este bien configurado, los equipos de una oficina suelen
  compartir la misma IP publica por NAT. Por eso esa IP usa una barrera mas
  amplia y el trabajo normal se distribuye por sesion.

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
  - CSV incluye tambien `requestId`, `actor`, `throttlerName`, `totalHits`,
    `trackerType`, `trackerKeyHash`, `userId`, `sessionId`, `requestLimit`,
    `windowSeconds`, `retryAfterSeconds`, `countedForBan`, `banLevelAfter`,
    `bannedUntilAfter` y `userAgent`.

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
- `RATE_LIMIT_SESSION_PER_MINUTE` (default `120`)
- `RATE_LIMIT_IP_PER_MINUTE` (default `600`)
