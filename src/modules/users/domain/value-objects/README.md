# Value Objects

Tipos inmutables que validan datos del dominio y exponen un valor normalizado.

## Archivos

- `email.vo.ts`: valida y normaliza el email; lanza `InvalidEmailError` si es invalido.
- `password.vo.ts`: valida y normaliza el password; lanza `InvalidPasswordError` si es invalido.
- `role.vo.ts`: valida y normaliza `roleId`; lanza `InvalidRoleIdError` si es invalido.
