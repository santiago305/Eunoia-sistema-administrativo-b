import { Repository } from "typeorm";
import { SupplierTypeormRepository } from "./supplier.typeorm.repo";
import { SupplierEntity } from "../entities/supplier.entity";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

describe("SupplierTypeormRepository", () => {
  const makeRow = (overrides?: Partial<SupplierEntity>) =>
    ({
      id: "sup-1",
      documentType: SupplierDocType.RUC,
      documentNumber: "20123456789",
      name: "Ana",
      lastName: "Perez",
      tradeName: "Comercial Ana",
      phone: "999888777",
      email: "ana@example.com",
      address: "Av. Central",
      note: null,
      leadTimeDays: 3,
      isActive: true,
      createdAt: new Date("2026-04-10T00:00:00.000Z"),
      updatedAt: new Date("2026-04-11T00:00:00.000Z"),
      ...overrides,
    }) as unknown as SupplierEntity;

  const createQueryBuilder = (rows: SupplierEntity[] = [makeRow()]) => ({
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([rows, rows.length]),
  });

  const makeRepository = (qb = createQueryBuilder()) => {
    const repo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      manager: {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(qb),
        }),
      },
    } as unknown as Repository<SupplierEntity>;

    return { repo: new SupplierTypeormRepository(repo), qb };
  };

  it("applies catalog filters for documentType and isActive", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({
      filters: [
        { field: "documentType", operator: "in", values: [SupplierDocType.RUC] },
        { field: "isActive", operator: "in", values: ["true"] },
      ],
      page: 1,
      limit: 10,
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(
      1,
      "s.documentType IN (:...filter_0_values)",
      { filter_0_values: [SupplierDocType.RUC] },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      2,
      "s.isActive IN (:...filter_1_values)",
      { filter_1_values: [true] },
    );
  });

  it("applies documentNumber equality and contains searches", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({
      filters: [
        { field: "documentNumber", operator: "eq", value: "20123456789" },
        { field: "documentNumber", operator: "contains", value: "1234" },
      ],
      page: 1,
      limit: 10,
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(
      1,
      "s.documentNumber ILIKE :documentNumber",
      { documentNumber: "%1234%" },
    );
  });

  it("maps text filters to the expected supplier columns", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({
      filters: [
        { field: "name", operator: "contains", value: "Ana" },
        { field: "lastName", operator: "eq", value: "Perez" },
        { field: "tradeName", operator: "contains", value: "Comercial" },
        { field: "phone", operator: "contains", value: "999" },
        { field: "email", operator: "eq", value: "ana@example.com" },
      ],
      page: 1,
      limit: 10,
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(
      1,
      "unaccent(coalesce(s.name, '')) ILIKE unaccent(:filter_0_value)",
      { filter_0_value: "%Ana%" },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      2,
      "unaccent(coalesce(s.lastName, '')) = unaccent(:filter_1_value)",
      { filter_1_value: "Perez" },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      3,
      "unaccent(coalesce(s.tradeName, '')) ILIKE unaccent(:filter_2_value)",
      { filter_2_value: "%Comercial%" },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      4,
      "unaccent(coalesce(s.phone, '')) ILIKE unaccent(:filter_3_value)",
      { filter_3_value: "%999%" },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      5,
      "unaccent(coalesce(s.email, '')) = unaccent(:filter_4_value)",
      { filter_4_value: "ana@example.com" },
    );
  });

  it("matches documentType and active-state labels in free text search", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({ q: "activo", page: 1, limit: 10 });

    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("s.isActive IN (:...matchedActiveStates)"),
      expect.objectContaining({
        q: "%activo%",
        matchedActiveStates: [true, false],
      }),
    );
  });
});
