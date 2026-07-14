import { Agency } from "src/modules/agencies/domain/entities/agency";
import { AgencyFactory } from "src/modules/agencies/domain/factories/agency.factory";
import { AgencyId } from "src/modules/agencies/domain/value-objects/agency-id.vo";
import { SubsidiaryId } from "src/modules/agencies/domain/value-objects/subsidiary-id.vo";
import { UbigeoDepartmentId } from "src/modules/agencies/domain/value-objects/ubigeo-department-id.vo";
import { UbigeoDistrictId } from "src/modules/agencies/domain/value-objects/ubigeo-district-id.vo";
import { UbigeoProvinceId } from "src/modules/agencies/domain/value-objects/ubigeo-province-id.vo";
import { UpdateAgencyUsecase } from "./update.usecase";

describe("UpdateAgencyUsecase", () => {
  const tx = {};
  const agencyId = "11111111-1111-4111-8111-111111111111";
  const keptSubsidiaryId = "22222222-2222-4222-8222-222222222222";
  const removedSubsidiaryId = "33333333-3333-4333-8333-333333333333";
  const district = {
    department: { id: "15", name: "Lima", normalizedName: "lima" },
    province: { id: "1501", departmentId: "15", name: "Lima", normalizedName: "lima" },
    district: { id: "150101", provinceId: "1501", name: "Lima", normalizedName: "lima" },
  };
  const createSubsidiary = (id: string, alias: string) =>
    AgencyFactory.createSubsidiary({
      subsidiaryId: new SubsidiaryId(id),
      agencyId: new AgencyId(agencyId),
      alias,
      departmentId: new UbigeoDepartmentId("15"),
      provinceId: new UbigeoProvinceId("1501"),
      districtId: new UbigeoDistrictId("150101"),
      basePrice: 14,
      isActive: true,
    });

  const setup = () => {
    const currentAgency = Agency.create({
      agencyId: new AgencyId(agencyId),
      name: "Shalom",
      isActive: true,
    });
    const agencyRepo = {
      findById: jest.fn().mockResolvedValue(currentAgency),
      findByIdWithSubsidiaries: jest.fn().mockResolvedValue({
        agency: currentAgency,
        subsidiaries: [
          createSubsidiary(keptSubsidiaryId, "Lima Centro"),
          createSubsidiary(removedSubsidiaryId, "Lima Norte"),
        ],
      }),
      findReferencedSubsidiaryIds: jest.fn().mockResolvedValue([]),
      updateWithSubsidiaries: jest.fn().mockResolvedValue(
        Agency.create({
          agencyId: new AgencyId(agencyId),
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
      agencyId,
      name: "Shalom Express",
      subsidiaries: [
        {
          id: keptSubsidiaryId,
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

  it("rejects deleting a subsidiary referenced by sale orders", async () => {
    const { usecase, agencyRepo } = setup();
    agencyRepo.findReferencedSubsidiaryIds.mockResolvedValue([removedSubsidiaryId]);

    await expect(
      usecase.execute({
        agencyId,
        name: "Shalom Express",
        subsidiaries: [
          {
            id: keptSubsidiaryId,
            alias: "Lima Centro",
            departmentId: "15",
            provinceId: "1501",
            districtId: "150101",
            basePrice: 14,
          },
        ],
      }),
    ).rejects.toThrow("No se puede eliminar sucursal referenciada en los pedidos");

    expect(agencyRepo.findReferencedSubsidiaryIds).toHaveBeenCalledWith(
      [removedSubsidiaryId],
      tx,
    );
    expect(agencyRepo.updateWithSubsidiaries).not.toHaveBeenCalled();
  });
});
