import { PreviewOrdersImportUseCase } from "./preview-orders-import.use-case";

describe("PreviewOrdersImportUseCase imported quantities", () => {
  it("reports an invalid quantity on its row instead of rejecting the whole preview", async () => {
    const useCase = Object.create(PreviewOrdersImportUseCase.prototype) as any;
    useCase.debug = jest.fn();
    useCase.toText = (value: unknown) => String(value ?? "").trim();
    useCase.normalizePhone = () => "999999999";
    useCase.parseDocumentFromDeliveryNote = () => null;
    useCase.getClientType = () => "PERSON";
    useCase.getSourceName = () => "WHATSAPP";
    useCase.resolveUbigeo = jest.fn().mockResolvedValue(null);
    useCase.resolveClient = jest.fn().mockResolvedValue({ action: "WOULD_CREATE" });
    useCase.resolveProductsPreview = jest.fn().mockResolvedValue([]);

    const row = await useCase.buildPreviewRow(
      { "Incluye codigos de producto": "Producto-EVA001 x 0.004" },
      7,
    );

    expect(row.rowNumber).toBe(7);
    expect(row.isValid).toBe(false);
    expect(row.errors.join(" ")).toMatch(/dos decimales/);
    expect(row.errors).not.toContain("Incluye códigos de producto es obligatorio");
    expect(useCase.resolveProductsPreview).toHaveBeenCalledWith([]);
  });
});
