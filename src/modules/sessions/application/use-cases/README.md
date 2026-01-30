# Use Cases

Casos de uso del modulo de sesiones.

## Archivos

- `create-session.usecase.ts`: crea una sesion nueva con metadata de dispositivo.
- `create-session.usecase.spec.ts`: pruebas unitarias de creacion de sesion.
- `list-user-sessions.usecase.ts`: lista sesiones de un usuario con filtros de revocadas/expiradas.
- `list-user-sessions.usecase.spec.ts`: pruebas unitarias de listado.
- `revoke-session.usecase.ts`: revoca una sesion puntual.
- `revoke-session.usecase.spec.ts`: pruebas unitarias de revocacion puntual.
- `revoke-all-sessions.usecase.ts`: revoca todas las sesiones del usuario.
- `revoke-all-sessions.usecase.spec.ts`: pruebas unitarias de revocacion total.
- `touch-session.usecase.ts`: actualiza `lastSeenAt` de una sesion valida.
- `touch-session.usecase.spec.ts`: pruebas unitarias de touch.
- `update-session-refresh.usecase.ts`: rota el hash del refresh token.
- `update-session-refresh.usecase.spec.ts`: pruebas unitarias de rotacion.
