# Guards

Guards para proteger rutas con JWT.

## Archivos

- `jwt-auth.guard.ts`: valida access token usando estrategia `jwt`.
- `jwt-refresh-auth.guard.ts`: valida refresh token usando estrategia `jwt-refresh`.

## CSRF

El guard CSRF se encuentra en `src/shared/utilidades/guards/csrf.guard.ts` y se aplica
en endpoints sensibles (logout, refresh, revocacion de sesiones, etc).
