import { QueryRunner } from "typeorm";
import { NormalizeFileStorageKeys20260714020000 } from "./20260714020000-normalize-file-storage-keys";

describe("NormalizeFileStorageKeys20260714020000", () => {
  it("normalizes active and deleted mail attachment storage keys", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;

    await new NormalizeFileStorageKeys20260714020000().up(queryRunner);

    const sql = queries.join("\n");
    expect(sql).toContain("UPDATE message_attachments");
    expect(sql).toContain("UPDATE deleted_mail_attachments");
    expect(sql).toContain("regexp_replace");
    expect(sql).toContain("private/mail-attachments/");
    expect(sql).toContain("deleted/mail-attachments/");
    expect(sql).toContain("storage[");
    expect(sql).toContain("(private[");
    expect(sql).toContain("(deleted[");
    expect(sql).toContain("])?mail-attachments[");
  });
});
