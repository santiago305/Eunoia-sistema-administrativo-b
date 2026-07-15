# Storage Unification Finish Design

## Goal

Close the remaining local-file-storage gaps before production retouches: PDFs must stop hardcoding `assets`, legacy assets need an idempotent migration path to `storage/public`, and new production evidence must move from the legacy `imageProdution` array into a first-class attachments table.

## Architecture

PDF use cases will consume a shared asset resolver that maps `/api/assets/...`, `/assets/...`, and relative public asset paths to local filesystem URLs using `storage/public` first and `assets` only as a legacy fallback. This keeps current PDF rendering local while isolating the future CDN switch to one helper.

Legacy asset migration will be an idempotent script that copies `assets/**` into `storage/public/**` without deleting the source. Public HTTP serving keeps the legacy fallback for one release.

Production evidence will use a new `production_attachments` table and repository. New uploads write to `storage/public/production-attachments/<productionId>/...`; `imageProdution` remains an API compatibility output derived from attachments plus legacy array values.

## Constraints

- Mail attachments remain private and are not affected.
- Public URLs stay `/api/assets/...`.
- No S3/CDN dependency is introduced now.
- Legacy `imageProdution` remains visible in API responses during compatibility.
- New production uploads must not write new evidence into the production order JSON array.

