import { GetSaleOrderEditorCatalogsUsecase } from "./get-editor-catalogs.usecase";

const createAdviserQueryBuilder = () => ({
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue([]),
});

describe("GetSaleOrderEditorCatalogsUsecase", () => {
  it("loads only 25 clients and subsidiaries for the initial editor suggestions", async () => {
    const clients = {
      find: jest.fn().mockResolvedValue([
        { id: "client-1", fullName: "Cliente Uno", docNumber: "12345678" },
      ]),
    };
    const warehouses = { find: jest.fn().mockResolvedValue([]) };
    const subsidiaries = {
      find: jest.fn().mockResolvedValue([
        { id: "subsidiary-1", alias: "Olva", address: "Av. 1", basePrice: 12 },
      ]),
    };
    const sources = { find: jest.fn().mockResolvedValue([]) };
    const workflows = {
      find: jest.fn().mockResolvedValue([
        {
          id: "workflow-2",
          name: "Abonado envio",
          isActive: true,
          revision: 2,
          createdAt: new Date("2026-08-20T10:00:00.000Z"),
          publishedAt: new Date("2026-08-21T10:00:00.000Z"),
        },
      ]),
    };
    const advisers = { createQueryBuilder: jest.fn().mockReturnValue(createAdviserQueryBuilder()) };
    const companyMethods = { find: jest.fn().mockResolvedValue([]) };
    const companyPaymentAccounts = { find: jest.fn().mockResolvedValue([]) };

    const usecase = new GetSaleOrderEditorCatalogsUsecase(
      clients as any,
      warehouses as any,
      subsidiaries as any,
      sources as any,
      workflows as any,
      advisers as any,
      companyMethods as any,
      companyPaymentAccounts as any,
    );

    const result = await usecase.execute({ companyId: "company-1" });

    expect(clients.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { fullName: "ASC" },
      take: 25,
    });
    expect(subsidiaries.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { alias: "ASC" },
      take: 25,
    });
    expect(workflows.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { createdAt: "DESC" },
    });
    expect(result.clients).toEqual([
      { id: "client-1", fullName: "Cliente Uno", docNumber: "12345678" },
    ]);
    expect(result.subsidiaries).toEqual([
      { id: "subsidiary-1", alias: "Olva", address: "Av. 1", basePrice: 12 },
    ]);
    expect(result.workflows).toEqual([
      {
        id: "workflow-2",
        name: "Abonado envio",
        isActive: true,
        revision: 2,
        createdAt: new Date("2026-08-20T10:00:00.000Z"),
        publishedAt: new Date("2026-08-21T10:00:00.000Z"),
      },
    ]);
  });
});
