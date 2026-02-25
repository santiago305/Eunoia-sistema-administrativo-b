# Adapters In

Puertos de entrada del modulo de usuarios.

## Estructura

- `controllers/`: endpoints HTTP y reglas de acceso.
- `dtos/`: DTOs con validaciones para requests.
- `guards/`: guards del modulo para reglas de acceso HTTP especificas (ej. ownership por `:id`).

## Seguridad

- La autorizacion se aplica en los controladores con `JwtAuthGuard` y `RolesGuard`.
- El upload de avatar valida ownership con un guard antes del `FileInterceptor` para evitar archivos huerfanos en disco.
