# Production Migration Runbook

## Preconditions

- Backend build passed with `pnpm run build`.
- Migration config tests passed with `pnpm test -- typeorm.config.spec.ts --runInBand`.
- Staging clean-database drill passed: `pnpm run clear`, `pnpm run migrate`, second `pnpm run migrate`, and `pnpm run seed`.
- Production `.env` has `NODE_ENV=production`.
- Production database backup was created and restore was tested.

## Deployment Steps

1. Stop application writes.
2. Create database backup.
3. Deploy backend artifact.
4. Run `pnpm run migrate`.
5. Start application.
6. Check health endpoint.
7. Check login, users, catalog, purchases, sales, production, mail, and security dashboard.

## Rollback

1. Stop application.
2. Restore database backup if migration caused data or schema corruption.
3. Redeploy previous backend artifact.
4. Start application.
5. Verify login and core list endpoints.
