import { Repository } from "typeorm";
import { WarehouseTypeormRepo } from "./warehouse.typeorm.repo";
import { WarehouseEntity } from "../entities/warehouse";

describe("WarehouseTypeormRepo", () => {
  const makeRow = (overrides?: Partial<WarehouseEntity>) =>
    ({
      id: "wh-1",
      name: "Almacen Central",
      department: "Lima",
      province: "Lima",
      district: "Ate",
      address: "Av. Principal 123",
      isActive: true,
      createdAt: new Date("2026-04-10T00:00:00.000Z"),
      ...overrides,
    }) as WarehouseEntity;

  const createQueryBuilder = (rows: WarehouseEntity[] = [makeRow()]) => ({
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
    } as unknown as Repository<WarehouseEntity>;

    return { repo: new WarehouseTypeormRepo(repo), qb };
  };

  it("applies isActive catalog filters as booleans", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({
      filters: [{ field: "isActive", operator: "in", values: ["true"] }],
      page: 1,
      limit: 10,
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      'w.isActive IN (:...filter_0_values)',
      { filter_0_values: [true] },
    );
  });

  it("maps catalog location fields to their SQL columns", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({
      filters: [
        { field: "department", operator: "in", values: ["Lima"] },
        { field: "province", operator: "in", values: ["Lima"] },
        { field: "district", operator: "in", values: ["Ate"] },
      ],
      page: 1,
      limit: 10,
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(
      1,
      'unaccent(w.department) IN (:...filter_0_values)',
      { filter_0_values: ["Lima"] },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      2,
      'unaccent(w.province) IN (:...filter_1_values)',
      { filter_1_values: ["Lima"] },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      3,
      'unaccent(w.district) IN (:...filter_2_values)',
      { filter_2_values: ["Ate"] },
    );
  });

  it("applies text fields with contains and eq semantics", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({
      filters: [
        { field: "name", operator: "contains", value: "Central" },
        { field: "address", operator: "eq", value: "Av. Principal 123" },
      ],
      page: 1,
      limit: 10,
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(
      1,
      "unaccent(coalesce(w.name, '')) ILIKE unaccent(:filter_0_value)",
      { filter_0_value: "%Central%" },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      2,
      "unaccent(coalesce(w.address, '')) = unaccent(:filter_1_value)",
      { filter_1_value: "Av. Principal 123" },
    );
  });

  it("matches active-state labels in the free text search", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({ q: "activo", page: 1, limit: 10 });

    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("w.isActive IN (:...matchedActiveStates)"),
      expect.objectContaining({
        q: "%activo%",
        matchedActiveStates: [true, false],
      }),
    );
  });
});
