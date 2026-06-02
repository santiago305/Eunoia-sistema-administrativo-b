import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { PreviewOrdersImportUseCase } from "./preview-orders-import.use-case";

describe("PreviewOrdersImportUseCase client reference", () => {
  const sanitizeReference = (PreviewOrdersImportUseCase.prototype as any)
    .sanitizeReference as (value: string | null | undefined) => string | undefined;

  const buildClientReference = (PreviewOrdersImportUseCase.prototype as any)
    .buildClientReference as (row: any) => string | undefined;

  const ctx: any = {
    toText: (value: unknown) => String(value ?? "").trim(),
    sanitizeReference: (value: string | null | undefined) => sanitizeReference.call(ctx, value),
  };

  it("falls back to raw text when cleaning removes everything", () => {
    const result = sanitizeReference.call(ctx, "✓✓✓   ");
    expect(result).toBe("✓✓✓");
  });

  it("generates a fallback reference for NONE docType when note is empty", () => {
    const row = {
      parsedDocument: { docType: ClientDocType.NONE, docNumber: "", reference: "   " },
      normalizedPhone: "999888777",
      recipientName: "Juan Perez",
    };

    const result = buildClientReference.call(ctx, row);
    expect(result).toBe("TEL 999888777");
  });

  it("uses sanitized delivery note when available", () => {
    const row = {
      parsedDocument: {
        docType: ClientDocType.NONE,
        docNumber: "",
        reference: "Dejar en portería!!! #$%",
      },
      normalizedPhone: "999888777",
      recipientName: "Juan Perez",
    };

    const result = buildClientReference.call(ctx, row);
    expect(result).toBe("Dejar en portera");
  });

  it("does not produce reference for DNI docType", () => {
    const row = {
      parsedDocument: { docType: ClientDocType.DNI, docNumber: "12345678", reference: null },
      normalizedPhone: "999888777",
      recipientName: "Juan Perez",
    };

    const result = buildClientReference.call(ctx, row);
    expect(result).toBeUndefined();
  });
});

