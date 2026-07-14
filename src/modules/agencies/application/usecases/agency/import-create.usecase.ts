import { BadRequestException, Inject, InternalServerErrorException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import {
  UBIGEO_REPOSITORY,
  UbigeoRepository,
} from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import {
  AGENCY_REPOSITORY,
  AgencyRepository,
} from "src/modules/agencies/domain/ports/agency.repository";
import { AgencyFactory } from "src/modules/agencies/domain/factories/agency.factory";
import { AgencyId } from "src/modules/agencies/domain/value-objects/agency-id.vo";
import { UbigeoDepartmentId } from "src/modules/agencies/domain/value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "src/modules/agencies/domain/value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "src/modules/agencies/domain/value-objects/ubigeo-district-id.vo";
import { InvalidUbigeoSelectionError } from "src/modules/agencies/domain/errors/invalid-ubigeo-selection.error";
import {
  ImportCreateAgencyInput,
  ImportCreateAgencyOutput,
  ImportCreateAgencyRowInput,
} from "../../dtos/agency/input/import-create.input";

const normalizeText = (value: string) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export class ImportCreateAgencyUsecase {
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

  async execute(input: ImportCreateAgencyInput): Promise<ImportCreateAgencyOutput> {
    const rows = input.rows ?? [];
    if (!rows.length) {
      throw new BadRequestException("Debes enviar al menos una sucursal");
    }

    const firstAlias = rows[0]?.alias?.trim();
    if (!firstAlias) {
      throw new BadRequestException("La primera fila debe tener alias");
    }

    const errors: ImportCreateAgencyOutput["errors"] = [];
    const validRows: Array<{ rowNumber: number; row: ImportCreateAgencyRowInput }> = [];
    const seen = new Set<string>();
    const existingAliases = new Set(
      (await this.agencyRepo.findExistingSubsidiaryAliases(rows.map((row) => row.alias ?? ""))).map(
        normalizeText,
      ),
    );

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const alias = row.alias?.trim();
      const aliasKey = normalizeText(alias ?? "");

      if (!alias) {
        errors.push({ rowNumber, message: "Alias es requerido" });
        return;
      }

      if (seen.has(aliasKey) || existingAliases.has(aliasKey)) {
        errors.push({ rowNumber, alias, message: "Sucursal ya existe" });
        return;
      }

      seen.add(aliasKey);
      validRows.push({ rowNumber, row: { ...row, alias } });
    });

    if (!validRows.length) {
      return {
        totalRows: rows.length,
        importedRows: 0,
        failedRows: errors.length,
        agencyId: null,
        rows: [],
        errors,
      };
    }

    const catalog = await this.ubigeoRepo.getCatalog();
    const resolveUbigeo = (row: ImportCreateAgencyRowInput) => {
      const departmentText = normalizeText(row.department);
      const provinceText = normalizeText(row.province);
      const districtText = normalizeText(row.district);

      const department = catalog.departments.find(
        (item) => item.id === row.department || normalizeText(item.name) === departmentText,
      );
      if (!department) {
        throw new BadRequestException("Departamento no existe");
      }

      const province = catalog.provinces.find(
        (item) =>
          item.departmentId === department.id &&
          (item.id === row.province || normalizeText(item.name) === provinceText),
      );
      if (!province) {
        throw new BadRequestException("Provincia no existe");
      }

      const district = catalog.districts.find(
        (item) =>
          item.provinceId === province.id &&
          (item.id === row.district || normalizeText(item.name) === districtText),
      );
      if (!district) {
        throw new BadRequestException("Distrito no existe");
      }

      return {
        departmentId: department.id,
        provinceId: province.id,
        districtId: district.id,
      };
    };

    return this.uow.runInTransaction(async (tx) => {
      const now = this.clock.now();
      const agency = AgencyFactory.createAgency({
        name: firstAlias,
        isActive: true,
        description: null,
        createdAt: now,
      });
      const agencyId = new AgencyId(agency.agencyId.value);
      const subsidiaries = [];
      const importedRows: ImportCreateAgencyOutput["rows"] = [];

      for (const item of validRows) {
        try {
          const resolvedUbigeo = resolveUbigeo(item.row);
          const districtRecord = await this.ubigeoRepo.findByDistrictCode(resolvedUbigeo.districtId);
          if (!districtRecord) {
            throw new BadRequestException(new InvalidUbigeoSelectionError("Distrito no existe").message);
          }
          if (
            districtRecord.department.id !== resolvedUbigeo.departmentId ||
            districtRecord.province.id !== resolvedUbigeo.provinceId
          ) {
            throw new BadRequestException(new InvalidUbigeoSelectionError().message);
          }

          const subsidiary = AgencyFactory.createSubsidiary({
            agencyId,
            alias: item.row.alias,
            departmentId: new UbigeoDepartmentId(resolvedUbigeo.departmentId),
            provinceId: new UbigeoProvinceId(resolvedUbigeo.provinceId),
            districtId: new UbigeoDistrictId(resolvedUbigeo.districtId),
            address: item.row.address?.trim() || undefined,
            basePrice: Number.isFinite(Number(item.row.price)) ? Number(item.row.price) : 0,
            isActive: true,
            createdAt: now,
          });

          subsidiaries.push(subsidiary);
          importedRows.push({
            rowNumber: item.rowNumber,
            subsidiaryId: subsidiary.subsidiaryId.value,
            alias: subsidiary.alias,
          });
        } catch (error) {
          errors.push({
            rowNumber: item.rowNumber,
            alias: item.row.alias,
            message: error instanceof Error ? error.message : "No se pudo importar sucursal",
          });
        }
      }

      if (!subsidiaries.length) {
        return {
          totalRows: rows.length,
          importedRows: 0,
          failedRows: errors.length,
          agencyId: null,
          rows: [],
          errors,
        };
      }

      try {
        await this.agencyRepo.createWithSubsidiaries(agency, subsidiaries, tx);
      } catch {
        throw new InternalServerErrorException("No se pudo crear la agencia");
      }

      return {
        totalRows: rows.length,
        importedRows: importedRows.length,
        failedRows: errors.length,
        agencyId: agency.agencyId.value,
        rows: importedRows,
        errors,
      };
    });
  }
}
