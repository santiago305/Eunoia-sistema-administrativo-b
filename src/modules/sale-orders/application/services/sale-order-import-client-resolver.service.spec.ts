import "reflect-metadata";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { SaleOrderImportClientResolverService } from "./sale-order-import-client-resolver.service";

describe("SaleOrderImportClientResolverService", () => {
  it("updates an existing client when import provides a defined client type", async () => {
    const createClientUsecase = { executeInTransaction: jest.fn() };
    const clientRepo = { update: jest.fn().mockResolvedValue({}) };
    const service = new SaleOrderImportClientResolverService(createClientUsecase as any, clientRepo as any);
    const tx = {} as any;

    await expect(
      service.resolveOrCreate(
        {
          clientResolution: { clientId: "client-1", matchedBy: "DNI" },
          clientType: ClientType.REPURCHASE,
        } as any,
        tx,
      ),
    ).resolves.toBe("client-1");

    expect(clientRepo.update).toHaveBeenCalledWith(
      { clientId: "client-1", type: ClientType.REPURCHASE },
      tx,
    );
    expect(createClientUsecase.executeInTransaction).not.toHaveBeenCalled();
  });

  it("keeps the current type when an existing client's imported type is undefined", async () => {
    const createClientUsecase = { executeInTransaction: jest.fn() };
    const clientRepo = { update: jest.fn() };
    const service = new SaleOrderImportClientResolverService(createClientUsecase as any, clientRepo as any);

    await expect(
      service.resolveOrCreate(
        {
          clientResolution: { clientId: "client-1", matchedBy: "PHONE" },
          clientType: ClientType.UNDEFINED,
        } as any,
        {} as any,
      ),
    ).resolves.toBe("client-1");

    expect(clientRepo.update).not.toHaveBeenCalled();
  });

  it("uses delivery note coordinates as reference when client has no DNI", async () => {
    const createClientUsecase = {
      executeInTransaction: jest.fn().mockResolvedValue("client-1"),
    };
    const service = new SaleOrderImportClientResolverService(createClientUsecase as any, {} as any);
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

  it("does not save a reference when delivery note has no usable reference", async () => {
    const createClientUsecase = {
      executeInTransaction: jest.fn().mockResolvedValue("client-1"),
    };
    const service = new SaleOrderImportClientResolverService(createClientUsecase as any, {} as any);

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
        reference: undefined,
      }),
      expect.anything(),
    );
  });
});
