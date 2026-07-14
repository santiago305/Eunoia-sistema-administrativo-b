import { ImportCreateAgencyUsecase } from "./import-create.usecase";

describe("ImportCreateAgencyUsecase", () => {
  const uow = { runInTransaction: jest.fn((callback) => callback({})) };
  const clock = { now: jest.fn(() => new Date("2026-07-13T00:00:00.000Z")) };
  const ubigeoRepo = {
    getCatalog: jest.fn(async () => ({
      departments: [{ id: "15", name: "Lima" }],
      provinces: [{ id: "1501", name: "Lima", departmentId: "15" }],
      districts: [{ id: "150101", name: "Lima", provinceId: "1501", departmentId: "15" }],
    })),
    findByDistrictCode: jest.fn(async (districtId: string) => ({
      department: { id: districtId.slice(0, 2), name: "Lima" },
      province: { id: districtId.slice(0, 4), name: "Lima" },
      district: { id: districtId, name: "Lima" },
    })),
  };
  const agencyRepo = {
    findExistingSubsidiaryAliases: jest.fn(async (aliases: string[]) =>
      aliases.includes("Duplicada") ? ["Duplicada"] : [],
    ),
    createWithSubsidiaries: jest.fn(async (agency: any) => agency),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses first row alias as agency name and rejects duplicate subsidiary aliases", async () => {
    const usecase = new ImportCreateAgencyUsecase(
      uow as any,
      agencyRepo as any,
      ubigeoRepo as any,
      clock as any,
    );

    const result = await usecase.execute({
      rows: [
        { alias: "Shalom", department: "Lima", province: "Lima", district: "Lima", price: 12 },
        { alias: "Duplicada", department: "Lima", province: "Lima", district: "Lima" },
      ],
    });

    expect(result.totalRows).toBe(2);
    expect(result.importedRows).toBe(1);
    expect(result.failedRows).toBe(1);
    expect(result.errors).toEqual([
      { rowNumber: 3, alias: "Duplicada", message: "Sucursal ya existe" },
    ]);
    expect(agencyRepo.createWithSubsidiaries).toHaveBeenCalled();
    const [agency] = agencyRepo.createWithSubsidiaries.mock.calls[0];
    expect(agency.name).toBe("Shalom");
  });
});
