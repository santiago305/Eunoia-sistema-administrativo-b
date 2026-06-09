import { BadRequestException } from "@nestjs/common";
import { CreateAgencyUsecase } from "./create.usecase";

describe("CreateAgencyUsecase", () => {
  const tx = {};
  const district = {
    department: { id: "15", name: "Lima", normalizedName: "lima" },
    province: { id: "1501", departmentId: "15", name: "Lima", normalizedName: "lima" },
    district: { id: "150101", provinceId: "1501", name: "Lima", normalizedName: "lima" },
  };

  const setup = () => {
    const agencyRepo = {
      createWithSubsidiaries: jest.fn().mockResolvedValue(undefined),
    } as any;
    const uow = {
      runInTransaction: jest.fn((work) => work(tx)),
    } as any;
    const ubigeoRepo = {
      findByDistrictCode: jest.fn().mockResolvedValue(district),
    } as any;
    const clock = { now: jest.fn(() => new Date("2026-06-03T00:00:00.000Z")) } as any;
    const usecase = new CreateAgencyUsecase(uow, agencyRepo, ubigeoRepo, clock);
    return { usecase, agencyRepo, uow };
  };

  it("creates agency and subsidiaries in one transaction", async () => {
    const { usecase, agencyRepo, uow } = setup();

    await usecase.execute({
      name: "Shalom",
      subsidiaries: [
        {
          alias: "Lima Centro",
          departmentId: "15",
          provinceId: "1501",
          districtId: "150101",
          address: "Av. Peru 123",
          basePrice: 10,
        },
      ],
    });

    expect(agencyRepo.createWithSubsidiaries).toHaveBeenCalledTimes(1);
    expect(uow.runInTransaction).toHaveBeenCalledTimes(1);
  });

  it("rejects create without subsidiaries", async () => {
    const { usecase } = setup();

    await expect(usecase.execute({ name: "Shalom", subsidiaries: [] })).rejects.toThrow(
      new BadRequestException("Debes enviar al menos una sucursal"),
    );
  });
});
