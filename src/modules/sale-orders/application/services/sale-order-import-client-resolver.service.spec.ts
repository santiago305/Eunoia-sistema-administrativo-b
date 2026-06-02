import "reflect-metadata";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { SaleOrderImportClientResolverService } from "./sale-order-import-client-resolver.service";

describe("SaleOrderImportClientResolverService", () => {
  it("uses delivery note coordinates as reference when client has no DNI", async () => {
    const createClientUsecase = {
      executeInTransaction: jest.fn().mockResolvedValue("client-1"),
    };
    const service = new SaleOrderImportClientResolverService(createClientUsecase as any);
    const tx = {} as any;

    const clientId = await service.resolveOrCreate(
      {
        clientResolution: { clientId: null, matchedBy: null },
        ubigeo: { departmentId: "15", provinceId: "1501", districtId: "150114" },
        clientType: ClientType.NEW,
        recipientName: "Carla Gonzalez Caceres",
        parsedDocument: {
          docType: ClientDocType.NONE,
          docNumber: "",
          reference: "-12.067073487054728, -76.95337387116433",
        },
        address: "Jr los agrologos 340",
        normalizedPhone: "995622971",
      } as any,
      tx,
    );

    expect(clientId).toBe("client-1");
    expect(createClientUsecase.executeInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: ClientDocType.NONE,
        docNumber: "",
        reference: "-12.067073487054728 -76.95337387116433",
      }),
      tx,
    );
  });

  it("falls back to phone when delivery note has no usable reference", async () => {
    const createClientUsecase = {
      executeInTransaction: jest.fn().mockResolvedValue("client-1"),
    };
    const service = new SaleOrderImportClientResolverService(createClientUsecase as any);

    await service.resolveOrCreate(
      {
        clientResolution: { clientId: null, matchedBy: null },
        ubigeo: { departmentId: "15", provinceId: "1501", districtId: "150114" },
        clientType: ClientType.NEW,
        recipientName: "Carla Gonzalez Caceres",
        parsedDocument: {
          docType: ClientDocType.NONE,
          docNumber: "",
          reference: "   ",
        },
        address: null,
        normalizedPhone: "995622971",
      } as any,
      {} as any,
    );

    expect(createClientUsecase.executeInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: "TEL 995622971",
      }),
      expect.anything(),
    );
  });
});
