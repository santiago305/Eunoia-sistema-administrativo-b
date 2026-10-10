import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { migrationDataSource } from "../src/infrastructure/database/typeorm.config";

export async function reconcileMailStorageQuota(dataSource = migrationDataSource) {
  const rows = await dataSource.query(`
    SELECT
      ref.user_id AS "userId",
      COALESCE(q.quota_bytes, 0)::bigint AS "quotaBytes",
      COALESCE(SUM(CASE WHEN ref.counts_storage = true AND ref.permanently_deleted_at IS NULL
        THEN att.size_bytes::bigint ELSE 0 END), 0)::bigint AS "usedBytes",
      COUNT(*) FILTER (WHERE ref.counts_storage = true AND ref.permanently_deleted_at IS NULL)::int AS "activeRefs",
      COUNT(*) FILTER (WHERE att.id IS NULL)::int AS "missingAttachmentRefs"
    FROM mail_attachment_user_refs ref
    LEFT JOIN message_attachments att ON att.id = ref.attachment_id
    LEFT JOIN mail_storage_quotas q ON q.user_id = ref.user_id
    GROUP BY ref.user_id, q.quota_bytes
    ORDER BY ref.user_id
  `);

  const users = rows.map((row: any) => ({
    userId: row.userId,
    quotaBytes: Number(row.quotaBytes ?? 0),
    usedBytes: Number(row.usedBytes ?? 0),
    activeRefs: Number(row.activeRefs ?? 0),
    missingAttachmentRefs: Number(row.missingAttachmentRefs ?? 0),
    overQuota: Number(row.usedBytes ?? 0) > Number(row.quotaBytes ?? 0),
  }));
  return {
    runId: randomUUID(),
    generatedAt: new Date().toISOString(),
    readOnly: true,
    users,
    overQuotaUsers: users.filter((user) => user.overQuota),
    missingAttachmentRefs: users.reduce((total, user) => total + user.missingAttachmentRefs, 0),
    ok: users.every((user) => !user.overQuota && user.missingAttachmentRefs === 0),
  };
}

async function main() {
  const output = process.argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
  await migrationDataSource.initialize();
  try {
    const report = await reconcileMailStorageQuota(migrationDataSource);
    const serialized = JSON.stringify(report, null, 2);
    if (output) await writeFile(output, serialized, "utf8");
    console.log(serialized);
    if (process.argv.includes("--strict") && !report.ok) process.exitCode = 2;
  } finally {
    await migrationDataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Error reconciliando cuotas de correo:", error);
    process.exitCode = 1;
  });
}
