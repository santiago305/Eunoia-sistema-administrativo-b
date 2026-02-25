# Adapters In

Puertos de entrada del modulo de usuarios.

## Estructura

- `controllers/`: endpoints HTTP y reglas de acceso.
- `dtos/`: DTOs con validaciones para requests.
- `guards/`: carpeta reservada para guards del modulo cuando se requieran reglas de acceso HTTP especificas.

## Seguridad

- La autorizacion se aplica en los controladores con `JwtAuthGuard` y `RolesGuard`.
- Las operaciones self-service (`/users/me/...`) usan el `id` del JWT para evitar parametros redundantes.
