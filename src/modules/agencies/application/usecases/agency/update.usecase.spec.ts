import { Agency } from "src/modules/agencies/domain/entities/agency";
import { AgencyId } from "src/modules/agencies/domain/value-objects/agency-id.vo";
import { UpdateAgencyUsecase } from "./update.usecase";

describe("UpdateAgencyUsecase", () => {
  const tx = {};
  const district = {
    department: { id: "15", name: "Lima", normalizedName: "lima" },
    province: { id: "1501", departmentId: "15", name: "Lima", normalizedName: "lima" },
    district: { id: "150101", provinceId: "1501", name: "Lima", normalizedName: "lima" },
  };

  const setup = () => {
    const agencyRepo = {
      findById: jest.fn().mockResolvedValue(
        Agency.create({
          agencyId: new AgencyId("11111111-1111-4111-8111-111111111111"),
          name: "Shalom",
          isActive: true,
        }),
      ),
      updateWithSubsidiaries: jest.fn().mockResolvedValue(
        Agency.create({
          agencyId: new AgencyId("11111111-1111-4111-8111-111111111111"),
          name: "Shalom Express",
          isActive: true,
        }),
      ),
    } as any;
    const uow = {
      runInTransaction: jest.fn((work) => work(tx)),
    } as any;
    const ubigeoRepo = {
      findByDistrictCode: jest.fn().mockResolvedValue(district),
    } as any;
    const clock = { now: jest.fn(() => new Date("2026-06-03T00:00:00.000Z")) } as any;
    const usecase = new UpdateAgencyUsecase(uow, agencyRepo, ubigeoRepo, clock);
    return { usecase, agencyRepo, uow };
  };

  it("updates agency and subsidiaries in one transaction", async () => {
    const { usecase, agencyRepo, uow } = setup();

    await usecase.execute({
      agencyId: "11111111-1111-4111-8111-111111111111",
      name: "Shalom Express",
      subsidiaries: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          alias: "Lima Centro",
          departmentId: "15",
          provinceId: "1501",
          districtId: "150101",
          basePrice: 14,
        },
      ],
    });

    expect(agencyRepo.updateWithSubsidiaries).toHaveBeenCalledTimes(1);
    expect(uow.runInTransaction).toHaveBeenCalledTimes(1);
  });
});
