import "dotenv/config";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { migrationDataSource } from "../src/infrastructure/database/typeorm.config";
import { LocalFileStorageService } from "../src/shared/utilidades/services/local-file-storage.service";

type PhysicalFile = {
  key: string;
  area: string;
  bytes: number;
  sha256: string;
};

type StoredReference = {
  key: string;
  source: string;
  expectedBytes?: number;
  expectedSha256?: string | null;
};

export const canonicalizeStorageKey = (
  storage: LocalFileStorageService,
  value: unknown,
): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return storage.resolve(value.trim()).key;
  } catch {
    return value.trim().replace(/\\/g, "/");
  }
};

const hashFile = async (storage: LocalFileStorageService, key: string) => {
  const file = storage.resolve(key);
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(file.absolutePath)) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    hash.update(buffer);
  }
  return { bytes, sha256: hash.digest("hex") };
};

const queryReferences = async (
  dataSource: typeof migrationDataSource,
  domains?: Set<string>,
): Promise<StoredReference[]> => {
  const rows: StoredReference[] = [];
  const queries: Array<{ source: string; domain: string; sql: string }> = [
    {
      source: "message_attachment",
      domain: "mail",
      sql: "SELECT storage_key, size_bytes AS expected_bytes FROM message_attachments WHERE storage_key IS NOT NULL",
    },
    {
      source: "mail_attachment_operation",
      domain: "mail",
      sql: "SELECT storage_key, actual_size_bytes AS expected_bytes, sha256 AS expected_sha256 FROM mail_attachment_operations WHERE storage_key IS NOT NULL",
    },
    {
      source: "sale_order_attachment",
      domain: "payment",
      sql: "SELECT storage_path FROM sale_order_attachments WHERE storage_path IS NOT NULL AND deleted_at IS NULL",
    },
    {
      source: "sale_payment_legacy_photo",
      domain: "payment",
      sql: "SELECT payment_photo FROM sale_payments WHERE payment_photo IS NOT NULL AND BTRIM(payment_photo) <> ''",
    },
  ];

  for (const query of queries) {
    if (domains?.size && !domains.has(query.domain)) continue;
    try {
      const result = await dataSource.query(query.sql);
      for (const row of result) {
        rows.push({
          key: row.storage_key ?? row.storage_path ?? row.payment_photo,
          source: query.source,
          expectedBytes: row.expected_bytes === null || row.expected_bytes === undefined ? undefined : Number(row.expected_bytes),
          expectedSha256: row.expected_sha256 ?? null,
        });
      }
    } catch {
      // A report must remain read-only and useful during rolling upgrades where
      // an optional table/column may not exist yet.
    }
  }
  return rows;
};

export async function auditMailAttachments(
  dataSource = migrationDataSource,
  storage = new LocalFileStorageService(),
  options: { domains?: string[] } = {},
) {
  const runId = randomUUID();
  const areas = ["private", "deleted", "staging", "quarantine"] as const;
  const physical: PhysicalFile[] = [];
  for (const area of areas) {
    const keys = (await storage.list?.(area, "mail-attachments")) ?? [];
    for (const key of keys) {
      try {
        const digest = await hashFile(storage, key);
        physical.push({ key, area, ...digest });
      } catch {
        // Keep the key visible while marking unreadable files in the report.
        physical.push({ key, area, bytes: -1, sha256: "UNREADABLE" });
      }
    }
  }

  const references = await queryReferences(dataSource, new Set(options.domains ?? []));
  const canonicalReferences = references
    .map((item) => ({ ...item, key: canonicalizeStorageKey(storage, item.key) }))
    .filter((item): item is StoredReference => Boolean(item.key));
  const referenceKeys = new Set(canonicalReferences.map((item) => item.key));
  const physicalKeys = new Set(physical.map((item) => item.key));

  const report = {
    runId,
    generatedAt: new Date().toISOString(),
    readOnly: true,
    areas: Object.fromEntries(
      areas.map((area) => [area, physical.filter((file) => file.area === area).length]),
    ),
    physical,
    references: canonicalReferences,
    missingPhysical: canonicalReferences
      .filter((item) => !physicalKeys.has(item.key))
      .map((item) => item),
    unreferencedPhysical: physical.filter((file) => !referenceKeys.has(file.key)),
    duplicateReferences: [...referenceKeys].filter(
      (key) => canonicalReferences.filter((item) => item.key === key).length > 1,
    ),
    mismatchedSize: canonicalReferences.filter((reference) => {
      if (reference.expectedBytes === undefined) return false;
      const physicalFile = physical.find((file) => file.key === reference.key);
      return physicalFile && physicalFile.bytes >= 0 && physicalFile.bytes !== reference.expectedBytes;
    }),
    mismatchedHash: canonicalReferences.filter((reference) => {
      if (!reference.expectedSha256) return false;
      const physicalFile = physical.find((file) => file.key === reference.key);
      return physicalFile && physicalFile.sha256 !== reference.expectedSha256;
    }),
  };
  return report;
}

export async function runMailAttachmentAudit() {
  const output = process.argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
  const domains = process.argv.find((arg) => arg.startsWith("--domain="))?.slice("--domain=".length).split(",").filter(Boolean);
  await migrationDataSource.initialize();
  try {
    const report = await auditMailAttachments(migrationDataSource, new LocalFileStorageService(), { domains });
    const serialized = JSON.stringify(report, null, 2);
    if (output) await writeFile(output, serialized, "utf8");
    console.log(serialized);
    return report;
  } finally {
    await migrationDataSource.destroy();
  }
}

if (require.main === module) {
  runMailAttachmentAudit().catch((error) => {
    console.error("Error auditando almacenamiento de adjuntos:", error);
    process.exitCode = 1;
  });
}
