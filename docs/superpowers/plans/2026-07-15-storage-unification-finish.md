# Storage Unification Finish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish storage unification by removing hardcoded PDF asset paths, documenting/coding legacy asset migration, and storing new production evidence in attachments.

**Architecture:** Add one shared PDF public asset resolver. Add one idempotent asset migration script. Add production attachment persistence and derive compatibility `imageProdution` output from attachments.

**Tech Stack:** NestJS, TypeScript, TypeORM, Jest, Node fs/promises.

## Global Constraints

- Public URLs remain `/api/assets/...`.
- Filesystem storage root remains configurable through `envs.files`.
- Legacy `assets` remains a read fallback for one release.
- Production API keeps returning `imageProdution: string[]`.
- Tests must prove the new resolver and production upload path.

---

### Task 1: Shared PDF Public Asset Resolver

**Files:**
- Create: `src/modules/pdf-generated/application/support/resolve-public-asset-url.ts`
- Test: `src/modules/pdf-generated/application/support/resolve-public-asset-url.spec.ts`
- Modify: `src/modules/pdf-generated/application/usecases/generate-*-pdf.usecase.ts`

**Steps:**
- [ ] Add failing tests for `/api/assets/company/logo.webp` resolving under `storage/public` before `assets`.
- [ ] Implement the resolver and WebP-to-PNG fallback.
- [ ] Replace duplicated `resolveLogoUrl` functions in PDF use cases.

### Task 2: Legacy Asset Migration Script

**Files:**
- Create: `scripts/migrate-assets-to-storage-public.ts`
- Test: `scripts/migrate-assets-to-storage-public.spec.ts`
- Modify: `package.json`

**Steps:**
- [ ] Add failing tests for idempotent recursive copy from `assets` to `storage/public`.
- [ ] Implement copy without deleting source and without overwriting same-size files unnecessarily.
- [ ] Add `migrate:assets` npm script.

### Task 3: Production Attachments

**Files:**
- Create: production attachment entity, repository port, repository implementation, output helper.
- Modify: production module/controller/get usecase and TypeORM config.
- Create migration: `20260715090000-create-production-attachments.ts`

**Steps:**
- [ ] Add failing controller test that upload writes `production-attachments/<id>` and does not call `orderRepo.update({ imageProdution })`.
- [ ] Add repository/migration tests for `production_attachments`.
- [ ] Implement production attachment persistence.
- [ ] Return `imageProdution` compatibility from attachment URLs plus legacy values.

### Task 4: Verification And Merge

**Steps:**
- [ ] Run focused Jest suites.
- [ ] Run `npm run build`.
- [ ] Commit branch.
- [ ] Merge `storage-unification-finish` into `master` if verification passes.

