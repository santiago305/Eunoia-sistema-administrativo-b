import { BadRequestException, Inject } from "@nestjs/common";
import {
  AGENCY_REPOSITORY,
  AgencyRepository,
} from "src/modules/agencies/domain/ports/agency.repository";
import {
  UBIGEO_REPOSITORY,
  UbigeoRepository,
} from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { AgencySearchRule } from "src/modules/agencies/application/dtos/agency-search/agency-search-snapshot";
import { sanitizeAgencySearchSnapshot } from "src/modules/agencies/application/support/agency-search.utils";
import {
  XlsxBuilderService,
  type XlsxColumn,
} from "src/shared/application/services/xlsx-builder.service";

type ExportColumnDefinition = {
  key: string;
  label: string;
  map: (row: any) => unknown;
};

const EXPORT_COLUMNS: ExportColumnDefinition[] = [
  { key: "alias", label: "Alias", map: (row) => row.alias ?? "" },
  {
    key: "department",
    label: "Departamento",
    map: (row) => row.departmentName ?? row.departmentId?.value ?? "",
  },
  {
    key: "province",
    label: "Provincia",
    map: (row) => row.provinceName ?? row.provinceId?.value ?? "",
  },
  {
    key: "district",
    label: "Distrito",
    map: (row) => row.districtName ?? row.districtId?.value ?? "",
  },
  { key: "address", label: "Direccion", map: (row) => row.address ?? "" },
  { key: "basePrice", label: "Precio", map: (row) => row.basePrice ?? 0 },
];

export type ExportAgenciesInput = {
  columns: Array<{ key: string; label: string }>;
  q?: string;
  filters?: Record<string, unknown>[];
};

export class ExportAgenciesExcelUsecase {
  constructor(
    @Inject(AGENCY_REPOSITORY)
    private readonly agencyRepo: AgencyRepository,
    @Inject(UBIGEO_REPOSITORY)
    private readonly ubigeoRepo: UbigeoRepository,
  ) {}

  getAvailableColumns(): Array<{ key: string; label: string }> {
    return EXPORT_COLUMNS.map((column) => ({ key: column.key, label: column.label }));
  }

  async execute(input: ExportAgenciesInput): Promise<{ filename: string; content: Buffer }> {
    if (!input.columns?.length) {
      throw new BadRequestException("Debes seleccionar al menos una columna");
    }

    const columnMap = new Map(EXPORT_COLUMNS.map((column) => [column.key, column]));
    const selected = input.columns
      .map((column) => ({ requested: column, source: columnMap.get(column.key) }))
      .filter(
        (item): item is { requested: { key: string; label: string }; source: ExportColumnDefinition } =>
          Boolean(item.source),
      );

    if (!selected.length) {
      throw new BadRequestException("No hay columnas validas para exportar");
    }

    const snapshot = sanitizeAgencySearchSnapshot({
      q: input.q,
      filters: input.filters as unknown as AgencySearchRule[],
    });

    const { items } = await this.agencyRepo.list({
      q: snapshot.q,
      filters: snapshot.filters,
      page: 1,
      limit: 20000,
    });

    const subsidiaries = items.flatMap((item) => (item as any).__subsidiaries ?? []);
    const catalog = await this.ubigeoRepo.getCatalog();
    const departmentsById = new Map(
      catalog.departments.map((item) => [item.id, item.name]),
    );
    const provincesById = new Map(
      catalog.provinces.map((item) => [item.id, item.name]),
    );
    const districtsById = new Map(
      catalog.districts.map((item) => [item.id, item.name]),
    );
    const enrichedSubsidiaries = subsidiaries.map((item) => ({
      ...item,
      departmentName: departmentsById.get(item.departmentId?.value),
      provinceName: provincesById.get(item.provinceId?.value),
      districtName: districtsById.get(item.districtId?.value),
    }));
    const rows = enrichedSubsidiaries.map((item) => {
      const output: Record<string, unknown> = {};
      selected.forEach(({ requested, source }) => {
        output[requested.key] = source.map(item);
      });
      return output;
    });

    const columns: XlsxColumn[] = selected.map(({ requested }) => ({
      key: requested.key,
      header: requested.label,
    }));

    const content = await new XlsxBuilderService().build({
      sheetName: "Sucursales",
      columns,
      rows,
    });

    return {
      filename: `agencias-${new Date().toISOString().slice(0, 10)}.xlsx`,
      content,
    };
  }
}
