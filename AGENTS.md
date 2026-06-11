# Repository Guidelines

## Project Structure & Module Organization

This is a NestJS TypeScript backend. Application entry points are `src/main.ts` and `src/app.module.ts`. Feature code lives in `src/modules/<feature>`, commonly split into `domain`, `application`, `adapters`, `composition`, and `infrastructure`. Shared cross-cutting code belongs in `src/shared`, while database configuration and migrations are under `src/infrastructure/database`. E2E tests live in `test`; most unit specs are colocated with source files as `*.spec.ts`. Runtime uploads or generated files are stored in `storage`, static assets in `assets`, and compiled output in `dist`.

## Build, Test, and Development Commands

Use the package scripts in `package.json`:

- `pnpm install` or `npm install`: install dependencies. Lockfiles for both tools exist; prefer the tool already used by your branch.
- `npm run start:dev`: run Nest in watch mode for local development.
- `npm run build`: compile TypeScript into `dist`.
- `npm run start:prod`: run the compiled app from `dist/main`.
- `npm run migrate`: execute TypeORM migrations.
- `npm run seed`, `npm run clear`, `npm run refresh-data`: manage local seed data.
- `docker compose up -d`: start Redis, required by cache/queue features.

## Coding Style & Naming Conventions

Use TypeScript and NestJS conventions. Formatting is managed by Prettier with single quotes and trailing commas; run `npm run format` before broad formatting changes. ESLint uses `@typescript-eslint`; run `npm run lint` to apply fixes. Keep file names kebab-case and descriptive, matching existing patterns such as `create-user.usecase.ts`, `users.controller.ts`, `email.vo.ts`, and `typeorm-user.repository.ts`. Keep module boundaries clear: domain code should not depend on HTTP controllers or TypeORM details.

## Testing Guidelines

Jest is the test framework. Unit tests use `*.spec.ts` and are discovered under `src`; e2e tests use `*.e2e-spec.ts` under `test` with `test/jest-e2e.json`. Run `npm test` for unit tests, `npm run test:e2e` for integration/e2e coverage, and `npm run test:cov` when changing shared logic or high-risk workflows. Add or update focused specs beside the code you change.

## Commit & Pull Request Guidelines

Recent commits use short imperative or summary messages, often in English or Spanish, for example `fix statesearch` or `avance sale-orders, agencies, workflows and importer`. Keep commits scoped to one concern. Pull requests should include a concise description, affected modules, required migrations or seed steps, test results, and linked issues when applicable.

## Security & Configuration Tips

Do not commit secrets from `.env`. Use `.env.example` when documenting new configuration keys. Validate environment changes through `src/infrastructure/config`, and note required Redis, PostgreSQL, or storage setup in the PR description.
