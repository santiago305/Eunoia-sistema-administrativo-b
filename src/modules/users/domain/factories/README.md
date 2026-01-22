# Factories

Las fabricas centralizan la creacion de entidades para asegurar consistencia.

## Archivos

- `user.factory.ts`: expone `createNew` para nuevos usuarios (sin `id`, `deleted = false`) y `reconstitute` para reconstruir desde persistencia (con `id`, `deleted`, `createdAt`).
