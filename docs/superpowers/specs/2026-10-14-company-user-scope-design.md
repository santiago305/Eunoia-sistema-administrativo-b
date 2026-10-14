# Asignación automática del alcance de empresa

## Objetivo

Garantizar que cada usuario normal pertenezca automáticamente a la empresa correcta y que una configuración financiera incompleta no bloquee la consulta de pedidos.

## Diseño aprobado

1. `company_id` se incorporará al modelo ORM, al modelo de dominio y al mapeador de usuarios. `CreateUserUseCase` tomará el ID de la empresa activa y lo persistirá al crear usuarios.
2. La creación inicial de la empresa recibirá el usuario autenticado y asignará su `company_id` dentro de la misma transacción. El repositorio de usuarios aceptará la actualización transaccional.
3. Una migración idempotente reparará usuarios normales existentes sin empresa cuando exista exactamente una empresa activa. Si hay varias empresas y usuarios sin asignación, la migración fallará de forma segura para exigir una asignación explícita.
4. La migración limpiará permisos financieros redundantes (`income.view_own` cuando el rol ya tenga `income.view_all`) y el servicio de control impedirá volver a asignar ambos alcances al mismo rol.
5. `SaleOrderAccessPolicyService` tratará la ausencia de empresa como falta de alcance financiero: permitirá listar pedidos y estadísticas con pagos omitidos, mientras los endpoints directos de ingresos seguirán respondiendo `403`.

## Seguridad y compatibilidad

- Los superadministradores conservarán el alcance global mediante `*` y no necesitarán `company_id`.
- Los usuarios normales no podrán elegir libremente la empresa desde el DTO; la asignación se derivará del contexto de creación.
- La migración no sobrescribirá asignaciones existentes.
- No se modificarán variables de entorno.

## Validación

- Pruebas unitarias de creación de usuarios y empresa.
- Pruebas del mapeador para conservar `company_id`.
- Pruebas del comportamiento de pedidos con alcance financiero incompleto.
- Compilación, pruebas dirigidas y suite completa del backend en desarrollo.
