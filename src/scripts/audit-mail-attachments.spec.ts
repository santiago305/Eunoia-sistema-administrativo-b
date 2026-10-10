import { auditMailAttachments, canonicalizeStorageKey } from "../../scripts/audit-mail-attachments";

describe("audit-mail-attachments", () => {
  it("normalizes legacy and quarantine keys without writing anything", () => {
    const storage = {
      resolve: jest.fn((value: string) => ({ key: value.startsWith("storage/") ? "private/mail-attachments/one.pdf" : value })),
    } as any;

    expect(canonicalizeStorageKey(storage, "storage/mail-attachments/one.pdf")).toBe(
      "private/mail-attachments/one.pdf",
    );
    expect(canonicalizeStorageKey(storage, "quarantine/mail-attachments/run/one.pdf")).toBe(
      "quarantine/mail-attachments/run/one.pdf",
    );
    expect(storage.resolve).toHaveBeenCalledTimes(2);
  });

  it("reports missing and unreferenced files as read-only findings", async () => {
    const storage = {
      list: jest.fn(async (area: string) =>
        area === "private" ? ["private/mail-attachments/one.pdf"] : [],
      ),
      resolve: jest.fn((key: string) => ({ key, absolutePath: key })),
    } as any;
    const dataSource = {
      query: jest.fn(async (sql: string) =>
        sql.includes("message_attachments")
          ? [{ storage_key: "private/mail-attachments/missing.pdf" }]
          : [],
      ),
    } as any;

    const report = await auditMailAttachments(dataSource, storage);

    expect(report.readOnly).toBe(true);
    expect(report.missingPhysical).toHaveLength(1);
    expect(report.unreferencedPhysical).toHaveLength(1);
    expect(storage.list).toHaveBeenCalledTimes(4);
  });
});
