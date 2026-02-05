# Use Cases

Casos de uso de autenticacion.

## Archivos

- `login-auth.usecase.ts`: valida credenciales, aplica bloqueo escalonado y genera tokens.
- `login-auth.usecase.spec.ts`: pruebas unitarias de login.
- `register-auth.usecase.ts`: crea usuario y genera tokens.
- `register-auth.usecase.spec.ts`: pruebas unitarias de registro.
- `refresh.auth.usecase.ts`: genera un nuevo access token con refresh token valido.
- `refresh-auth.usecase.spec.ts`: pruebas unitarias de refresh.
- `get-auth-user.usecase.ts`: devuelve el id y rol del usuario autenticado.

## Politica de bloqueo

Escalera por intentos fallidos, con tiempos: 1m, 5m, 30m, 1h, 1d.
En el ultimo nivel se desactiva la cuenta y requiere reactivacion.
