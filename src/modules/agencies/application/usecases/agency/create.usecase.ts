import {
  BadRequestException,
  Inject,
  InternalServerErrorException,
} from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { UBIGEO_REPOSITORY, UbigeoRepository } from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { AgencyFactory } from "src/modules/agencies/domain/factories/agency.factory";
import { AGENCY_REPOSITORY, AgencyRepository } from "src/modules/agencies/domain/ports/agency.repository";
import { CreateAgencyInput, SubsidiaryInput } from "../../dtos/agency/input/create.input";
import { UbigeoDepartmentId } from "src/modules/agencies/domain/value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "src/modules/agencies/domain/value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "src/modules/agencies/domain/value-objects/ubigeo-district-id.vo";
import { InvalidUbigeoSelectionError } from "src/modules/agencies/domain/errors/invalid-ubigeo-selection.error";
import { InvalidAgencyError } from "src/modules/agencies/domain/errors/invalid-agency.error";
import { AgencyId } from "src/modules/agencies/domain/value-objects/agency-id.vo";

export class CreateAgencyUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(AGENCY_REPOSITORY)
    private readonly agencyRepo: AgencyRepository,
    @Inject(UBIGEO_REPOSITORY)
    private readonly ubigeoRepo: UbigeoRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  private async validateUbigeo(input: SubsidiaryInput) {
    let departmentId: UbigeoDepartmentId;
    let provinceId: UbigeoProvinceId;
    let districtId: UbigeoDistrictId;
    try {
      departmentId = new UbigeoDepartmentId(input.departmentId);
      provinceId = new UbigeoProvinceId(input.provinceId);
      districtId = new UbigeoDistrictId(input.districtId);
    } catch {
      throw new BadRequestException("Ubigeo invalido");
    }

    const districtRecord = await this.ubigeoRepo.findByDistrictCode(districtId.value);
    if (!districtRecord) {
      throw new BadRequestException(new InvalidUbigeoSelectionError("Distrito no existe").message);
    }
    if (
      districtRecord.department.id !== departmentId.value ||
      districtRecord.province.id !== provinceId.value
    ) {
      throw new BadRequestException(new InvalidUbigeoSelectionError().message);
    }

    return { departmentId, provinceId, districtId };
  }

  async execute(input: CreateAgencyInput): Promise<{ message: string }> {
    if (!input.subsidiaries?.length) {
      throw new BadRequestException("Debes enviar al menos una sucursal");
    }

    return this.uow.runInTransaction(async (tx) => {
      const now = this.clock.now();
      let agency;
      try {
        agency = AgencyFactory.createAgency({
          name: input.name,
          isActive: input.isActive ?? true,
          createdAt: now,
        });
      } catch (error) {
        if (error instanceof InvalidAgencyError) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }

      const agencyId = new AgencyId(agency.agencyId.value);
      const subsidiaries = [];
      for (const item of input.subsidiaries) {
        const ubigeo = await this.validateUbigeo(item);
        subsidiaries.push(
          AgencyFactory.createSubsidiary({
            agencyId,
            alias: item.alias,
            ...ubigeo,
            address: item.address,
            basePrice: item.basePrice ?? 0,
            note: item.note,
            isActive: item.isActive ?? true,
            createdAt: now,
          }),
        );
      }

      try {
        await this.agencyRepo.createWithSubsidiaries(agency, subsidiaries, tx);
      } catch {
        throw new InternalServerErrorException("No se pudo crear la agencia");
      }

      return { message: "Agencia creada con exito" };
    });
  }
}
