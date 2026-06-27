import { QueryRunner } from "typeorm";
import { MigrateLegacyPurchaseImagesToAttachments20260627120000 } from "./20260627120000-migrate-legacy-purchase-images-to-attachments";

describe("MigrateLegacyPurchaseImagesToAttachments20260627120000", () => {
  it("copies legacy image_prodution rows into purchase attachments without duplicating paths", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (query: string) => {
        queries.push(query);
      }),
    } as unknown as QueryRunner;

    await new MigrateLegacyPurchaseImagesToAttachments20260627120000().up(queryRunner);

    const sql = queries.join("\n");
    expect(sql).toContain("jsonb_array_elements_text");
    expect(sql).toContain("CASE WHEN jsonb_typeof(po.image_prodution) = 'array'");
    expect(sql).toContain("purchase_attachments");
    expect(sql).toContain("'PRODUCT_PHOTO'");
    expect(sql).toContain("NOT EXISTS");
    expect(sql).toContain("existing.storage_path = legacy.storage_path");
  });
});
