# Users Module

Modulo de usuarios. Gestiona perfiles, credenciales y operaciones de cuenta.

## Estructura

- `adapters/`: entrada/salida (HTTP, DTOs, persistencia).
- `application/`: casos de uso y puertos.
- `domain/`: entidades y value objects.
- `infrastructure/`: modulo Nest y seeders.

## Seguridad

- Rutas protegidas con `JwtAuthGuard` y `RolesGuard` segun el endpoint.
