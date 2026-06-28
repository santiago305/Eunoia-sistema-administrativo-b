import { AddFiscalDocumentTypeToPurchaseAttachments20260628010000 } from "./20260628010000-add-fiscal-document-type-to-purchase-attachments";

describe("AddFiscalDocumentTypeToPurchaseAttachments20260628010000", () => {
  it("adds a fiscal document type column and a unique active fiscal document index", async () => {
    const migration = new AddFiscalDocumentTypeToPurchaseAttachments20260628010000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    await migration.up(queryRunner as never);

    const sql = queries.join("\n");
    expect(sql).toContain("ALTER TYPE purchase_attachment_type ADD VALUE 'FISCAL_DOCUMENT'");
    expect(sql).toContain("fiscal_document_type voucher_doc_type");
    expect(sql).toContain("ux_purchase_attachments_one_fiscal_document");
    expect(sql).toContain("type::text IN ('FISCAL_DOCUMENT', 'INVOICE', 'RECEIPT')");
  });
});
