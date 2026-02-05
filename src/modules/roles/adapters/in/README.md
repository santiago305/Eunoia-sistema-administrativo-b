# Adapters In

Puertos de entrada del modulo de roles.

## Estructura

- `controllers/`: endpoints HTTP.
- `dtos/`: DTOs de entrada.
- `guards/`: carpeta reservada para guards (sin archivos por ahora).

## Seguridad

- Endpoints protegidos con `JwtAuthGuard` y `RolesGuard` (ADMIN).
