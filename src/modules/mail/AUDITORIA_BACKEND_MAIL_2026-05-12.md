# Auditoria Backend Mail - 2026-05-12

Ruta auditada: `src/modules/mail`

## 1) Como se crean hoy las notificaciones
- Se crean desde `NotificationsService.createNotificationForUsers(...)`.
- Compras y pagos invocan ese servicio directamente (use cases/controladores).
- Tambien existe envio manual de mensajes por `sendMessage`, `replyMessage`, `forwardMessage`.

## 2) Como se guardan actualmente
- Notificaciones del sistema: tablas `notifications`, `notification_recipients`, `notification_outbox`, `notification_delivery_attempts`.
- Mensajeria: tablas `messages`, `message_threads`, `message_recipients`.

## 3) Que tablas/entidades existen hoy
- Entidades actuales:
  - `notification.entity.ts`
  - `notification-recipient.entity.ts`
  - `notification-outbox.entity.ts`
  - `notification-delivery-attempt.entity.ts`
  - `message.entity.ts`
  - `message-thread.entity.ts`
  - `message-recipient.entity.ts`

## 4) Como se conecta con Sileo / realtime
- Gateway websocket: namespace `/notifications` en `notification.gateway.ts`.
- Servicio realtime en memoria por usuario/socket: `notification-realtime.service.ts`.
- Flujo: persistencia -> outbox/worker -> emision realtime a sockets conectados.

## 5) Como compras dispara notificaciones
- Compras inyecta `NotificationsService` y llama `createNotificationForUsers(...)` en varios casos de uso:
  - `create.usecase.ts`
  - `confirm-reception.usecase.ts`
  - `cancel.usecase.ts`
  - `set-sent.usecase.ts`
  - `run-expected-at.usecase.ts`

## 6) Que endpoints ya existen
- Controlador unico: `notifications.controller.ts` con rutas base `email` y `notifications`.
- Ya existen endpoints de:
  - notificaciones clasicas (listar, detalle, leido, visto, archivar)
  - mensajes (listar, detalle, enviar, reply, forward, star, delete, restore, bulk)
  - borradores (listar, crear, actualizar, eliminar, enviar)
  - modulos permitidos (`GET /modules`)

## 7) Que componentes backend ya existen (lado API)
- DTOs para mensajes, reply/forward, drafts, bulk actions, queries.
- Servicio central `NotificationsService` con logica de inbox/sent/drafts.
- Cola y worker de notificaciones (outbox).

## 8) Que logica de permisos existe en access-control
- Permisos clave existentes:
  - `page.notifications.view`
  - `notifications.read`
  - `notifications.manage`
- Mapeo por modulo en `permissions-seed.ts`.
- `NotificationsService` ya valida modulos permitidos por usuario para filtros de modulo.

## 9) Que se reutiliza
- Realtime actual (gateway + service).
- Integracion actual de compras/pagos que ya invoca el servicio de notificaciones.
- Endpoints base `/notifications` y `/email`.
- Tablas `messages` y `message_threads` como base inicial.

## 10) Que se reemplaza
- Estado por destinatario en `message_recipients` (read/star/delete) debe migrar a `message_user_states`.
- `notifications` y `notification_recipients` deben converger gradualmente al modelo unificado de mensajes/tipos.
- `NotificationsService` monolitico debe separarse en casos de uso/puertos.

## 11) Que se elimina
- No se elimina inmediatamente en esta fase para evitar ruptura productiva.
- Se planifica deprecacion progresiva de:
  - campos de estado en `message_recipients`
  - rutas legacy de notificacion clasica, cuando el frontend migre al centro unificado.

## 12) FlashMessage
- Busqueda en backend (`src`) sin coincidencias para `FlashMessage`.
- Estado actual: no hay implementacion activa de FlashMessage en backend.

## Diagnostico
- El backend ya no es "solo notificaciones": tiene una base de mensajeria real.
- Falta la pieza estructural clave para escalar tipo Gmail: `message_user_states` + etiquetas + adjuntos + historial + auditoria.
- Se recomienda mantener compatibilidad temporal mientras se migra a endpoints y tablas nuevas.
