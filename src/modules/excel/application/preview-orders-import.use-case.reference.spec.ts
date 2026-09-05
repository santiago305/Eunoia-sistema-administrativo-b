import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { PreviewOrdersImportUseCase } from "./preview-orders-import.use-case";

describe("PreviewOrdersImportUseCase client resolution", () => {
  const resolveClient = (PreviewOrdersImportUseCase.prototype as any)
    .resolveClient as (input: any) => Promise<any>;

  it("does not resolve by arbitrary delivery note reference", async () => {
    const findByReference = jest.fn().mockResolvedValue({
      clientId: { value: "wrong-client-from-reference" },
    });
    const ctx: any = {
      debug: jest.fn(),
      telephoneRepo: { findByNumber: jest.fn().mockResolvedValue(null) },
      clientRepo: {
        findByDocument: jest.fn().mockResolvedValue(null),
        findByReference,
      },
    };

    const result = await resolveClient.call(ctx, {
      phone: "958293306",
      parsedDocument: {
        docType: ClientDocType.NONE,
        docNumber: "",
        reference: "PIURA",
      },
    });

    expect(result).toEqual({
      status: "WOULD_CREATE",
      clientId: null,
      matchedBy: null,
    });
    expect(findByReference).not.toHaveBeenCalled();
  });
});
