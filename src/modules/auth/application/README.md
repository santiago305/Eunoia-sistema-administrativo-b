# Auth Application

Capa de aplicacion del modulo de autenticacion.

## Estructura

- `ports/`: contratos para tokens y hash de password.
- `use-cases/`: casos de uso de login, registro y refresh.

## Notas de seguridad

- Login aplica politica de bloqueo escalonado por intentos fallidos.
- Al login exitoso se reinician contadores de bloqueo.
