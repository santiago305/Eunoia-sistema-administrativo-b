# Eunoia Backend

API administrativa construida con NestJS, TypeORM, PostgreSQL y Redis.

## Requisitos

- Node.js 20+
- npm
- PostgreSQL 16+
- Redis 7+

## Configuracion local

1. Copia `.env.example` a `.env`.
2. Ajusta las credenciales de base de datos y Redis.
3. Define los origenes permitidos para CORS:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

En produccion agrega el dominio del frontend, separado por comas si hay mas de uno.

## Instalacion

```bash
npm install
```

## Ejecutar

```bash
npm run start:dev
```

La API queda disponible en `http://localhost:3000/api`.

## Scripts utiles

```bash
npm run build
npm test
npm run test:e2e
npm run migrate
npm run seed
```

## Docker

Desde la raiz del workspace (`D:\eunoia`):

```bash
docker compose up --build
```

Servicios expuestos:

- Backend: `http://localhost:3000/api`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

El compose raiz sobrescribe `DB_HOST=db` y `REDIS_HOST=redis` para que el backend use los servicios internos.
Los valores `COOKIE_SECRET` y `JWT_SECRET` del compose son placeholders para desarrollo; cambialos antes de usar ese archivo en un entorno compartido o productivo.

## Variables principales

- `PORT`: puerto HTTP del backend.
- `NODE_ENV`: `development`, `test` o `production`.
- `CORS_ORIGINS`: lista separada por comas de origenes permitidos.
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`: conexion PostgreSQL.
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`: conexion Redis.
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_ISSUER`, `JWT_REFRESH_EXPIRES_IN`: autenticacion.
- `COOKIE_SECRET`: firma de cookies.
- `MAIL_STORAGE_ACTIVE_DIR`, `MAIL_STORAGE_DELETED_DIR`: almacenamiento de adjuntos de correo.

## Estructura

- `src/main.ts`: arranque HTTP, CORS, middleware global y assets publicos.
- `src/infrastructure/config/envs.ts`: validacion y normalizacion de variables de entorno.
- `src/infrastructure/database`: TypeORM, migraciones y configuracion de base de datos.
- `src/modules`: modulos de negocio.
- `test`: pruebas e2e.
