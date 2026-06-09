import {
  BadRequestException,
  ConflictException,
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { UBIGEO_REPOSITORY, UbigeoRepository } from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { AGENCY_REPOSITORY, AgencyRepository } from "src/modules/agencies/domain/ports/agency.repository";
import { UpdateAgencyInput } from "../../dtos/agency/input/update.input";
import { SubsidiaryInput } from "../../dtos/agency/input/create.input";
import { AgencyNotFoundError } from "../../errors/agency-not-found.error";
import { UbigeoDepartmentId } from "src/modules/agencies/domain/value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "src/modules/agencies/domain/value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "src/modules/agencies/domain/value-objects/ubigeo-district-id.vo";
import { InvalidUbigeoSelectionError } from "src/modules/agencies/domain/errors/invalid-ubigeo-selection.error";
import { InvalidAgencyError } from "src/modules/agencies/domain/errors/invalid-agency.error";
import { AgencyFactory } from "src/modules/agencies/domain/factories/agency.factory";
import { AgencyId } from "src/modules/agencies/domain/value-objects/agency-id.vo";
import { SubsidiaryId } from "src/modules/agencies/domain/value-objects/subsidiary-id.vo";

export class UpdateAgencyUsecase {
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

  async execute(input: UpdateAgencyInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.agencyRepo.findById(input.agencyId, tx);
      if (!current) {
        throw new NotFoundException(new AgencyNotFoundError().message);
      }

      try {
        const now = this.clock.now();
        const next = current.update({
          name: input.name,
          isActive: input.isActive,
          updatedAt: now,
        });

        const subsidiaries = [];
        if (input.subsidiaries) {
          const agencyId = new AgencyId(current.agencyId.value);
          for (const item of input.subsidiaries) {
            const ubigeo = await this.validateUbigeo(item);
            const subsidiary = AgencyFactory.createSubsidiary({
              subsidiaryId: item.id ? new SubsidiaryId(item.id) : undefined,
              agencyId,
              alias: item.alias,
              ...ubigeo,
              address: item.address,
              basePrice: item.basePrice ?? 0,
              note: item.note,
              isActive: item.isActive ?? true,
              updatedAt: now,
            });
            (subsidiary as any).__isNew = !item.id;
            subsidiaries.push(subsidiary);
          }
        }

        const updated = await this.agencyRepo.updateWithSubsidiaries(
          {
            agencyId: next.agencyId.value,
            name: next.name,
            isActive: next.isActive,
            updatedAt: next.updatedAt,
            subsidiaries: input.subsidiaries ? subsidiaries : undefined,
          },
          tx,
        );

        if (!updated) {
          throw new BadRequestException("No se pudo actualizar la agencia");
        }
      } catch (error) {
        if (error instanceof InvalidAgencyError) {
          throw new BadRequestException(error.message);
        }

        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException ||
          error instanceof ConflictException
        ) {
          throw error;
        }

        if ((error as any)?.code === "23505") {
          throw new ConflictException("Agencia ya registrada");
        }

        throw new InternalServerErrorException("No se pudo actualizar la agencia");
      }

      return { message: "Agencia actualizada con exito" };
    });
  }
}
