# Use Cases

Casos de uso del modulo de usuarios.

## Archivos

- `change-password.usecase.ts`: cambia la contrasena del usuario validando credenciales actuales.
- `change-password.usecase.spec.ts`: pruebas unitarias del cambio de contrasena.
- `create-user.usecase.ts`: crea un usuario nuevo y valida la existencia del rol `ADVISER` cuando no se envia `roleId`.
- `create-user.usecase.spec.ts`: pruebas unitarias de creacion de usuario.
- `delete-user.usecase.ts`: marca un usuario como eliminado.
- `delete-user.usecase.spec.ts`: pruebas unitarias de eliminacion de usuario.
- `get-own-user.usecase.ts`: obtiene el perfil del usuario autenticado.
- `get-own-user.usecase.spec.ts`: pruebas unitarias de perfil propio.
- `get-user.usecase.ts`: obtiene un usuario por id.
- `get-user.usecase.spec.ts`: pruebas unitarias de consulta por id.
- `get-user-by-email.usecase.ts`: obtiene un usuario por email.
- `get-user-by-email.usecase.spec.ts`: pruebas unitarias de consulta por email.
- `get-user-with-password-by-email.usecase.ts`: obtiene usuario por email incluyendo password para autenticacion.
- `get-user-with-password-by-email.usecase.spec.ts`: pruebas unitarias de consulta con password.
- `list-users.usecase.ts`: lista usuarios con filtros, paginacion y estado (`all`, `active`, `inactive`).
- `list-users.usecase.spec.ts`: pruebas unitarias de listado general y filtrado por estado.
- `restore-user.usecase.ts`: restaura un usuario marcado como eliminado.
- `restore-user.usecase.spec.ts`: pruebas unitarias de restauracion.
- `update-avatar.usecase.ts`: actualiza el avatar del usuario.
- `update-avatar.usecase.spec.ts`: pruebas unitarias de actualizacion de avatar.
- `update-user.usecase.ts`: actualiza datos del usuario.
- `update-user.usecase.spec.ts`: pruebas unitarias de actualizacion.
