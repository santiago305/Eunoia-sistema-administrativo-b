import "reflect-metadata";
import { PERMISSIONS_KEY } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { IncomeController } from "./income.controller";

describe("IncomeController evidence contract", () => {
  it("requires separate permissions for reading content and attaching evidence", () => {
    const prototype = IncomeController.prototype;
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.evidence)).toEqual(["income.read", "payments.view_evidence"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.evidenceContent)).toEqual(["income.read", "payments.view_evidence"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.uploadEvidenceFile)).toEqual(["income.read", "payments.attach_evidence"]);
  });

  it("serves private image content with no-store caching", async () => {
    const getEvidence = { execute: jest.fn(async () => ({ url: "private/sale-order-attachments/order/proof.webp", mimeType: "image/webp" })) };
    const fileStorage = { read: jest.fn(async () => Buffer.from("image")) };
    const response = { setHeader: jest.fn(), send: jest.fn() };
    const controller = new IncomeController({} as any, {} as any, getEvidence as any, {} as any, fileStorage as any);
    await controller.evidenceContent("income-1", response as any);
    expect(fileStorage.read).toHaveBeenCalledWith("private/sale-order-attachments/order/proof.webp");
    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "private, no-store");
    expect(response.send).toHaveBeenCalledWith(Buffer.from("image"));
  });
});
