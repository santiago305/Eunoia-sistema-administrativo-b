import { readFileSync } from "fs";
import { join } from "path";
import { DataSource } from "typeorm";
import { normalizeUbigeoName } from "../../shared/utils/normalize-ubigeo-name.util";
import { UbigeoDepartmentEntity } from "../../adapters/out/persistence/typeorm/entities/ubigeo-department.entity";
import { UbigeoProvinceEntity } from "../../adapters/out/persistence/typeorm/entities/ubigeo-province.entity";
import { UbigeoDistrictEntity } from "../../adapters/out/persistence/typeorm/entities/ubigeo-district.entity";

interface UbigeoSeedRow {
  departmentCode: string;
  departmentName: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
}

const PROVINCE_NAME_OVERRIDES: Record<string, string> = {
  // El dataset fuente trae 1608 como "Maynas", pero el código oficial corresponde a Putumayo.
  "1608": "Putumayo",
};

const getUbigeoSeedRows = (): UbigeoSeedRow[] => {
  const filePath = join(
    process.cwd(),
    "src",
    "modules",
    "ubigeo",
    "infrastructure",
    "seed",
    "data",
    "ubigeo-peru.json",
  );

  return JSON.parse(readFileSync(filePath, "utf-8")) as UbigeoSeedRow[];
};

export const seedUbigeo = async (dataSource: DataSource): Promise<void> => {
  const rows = getUbigeoSeedRows();

  const departmentsRepo = dataSource.getRepository(UbigeoDepartmentEntity);
  const provincesRepo = dataSource.getRepository(UbigeoProvinceEntity);
  const districtsRepo = dataSource.getRepository(UbigeoDistrictEntity);

  const departments = new Map<string, UbigeoDepartmentEntity>();
  const provinces = new Map<string, UbigeoProvinceEntity>();
  const districts = new Map<string, UbigeoDistrictEntity>();

  for (const row of rows) {
    const provinceName = (PROVINCE_NAME_OVERRIDES[row.provinceCode] ?? row.provinceName).trim();

    departments.set(row.departmentCode, {
      id: row.departmentCode,
      name: row.departmentName.trim(),
      normalizedName: normalizeUbigeoName(row.departmentName),
      provinces: [],
    });

    provinces.set(row.provinceCode, {
      id: row.provinceCode,
      name: provinceName,
      normalizedName: normalizeUbigeoName(provinceName),
      departmentId: row.departmentCode,
      department: undefined,
      districts: [],
    });

    districts.set(row.districtCode, {
      id: row.districtCode,
      name: row.districtName.trim(),
      normalizedName: normalizeUbigeoName(row.districtName),
      provinceId: row.provinceCode,
      province: undefined,
    });
  }

  const duplicateProvinceNaturalKeys = new Map<string, string[]>();
  for (const province of provinces.values()) {
    const key = `${province.departmentId}|${province.normalizedName}`;
    const existing = duplicateProvinceNaturalKeys.get(key) ?? [];
    existing.push(province.id);
    duplicateProvinceNaturalKeys.set(key, existing);
  }

  const conflicts = Array.from(duplicateProvinceNaturalKeys.entries()).filter(([, ids]) => ids.length > 1);
  if (conflicts.length) {
    throw new Error(
      `[UbigeoSeeder] Provincias duplicadas por (departmentId, normalizedName): ${conflicts
        .map(([key, ids]) => `${key} => ${ids.join(",")}`)
        .join("; ")}`,
    );
  }

  await departmentsRepo.upsert(Array.from(departments.values()), ["id"]);
  await provincesRepo.upsert(Array.from(provinces.values()), ["id"]);
  await districtsRepo.upsert(Array.from(districts.values()), ["id"]);

  console.log(
    `[UbigeoSeeder] Seed completado: ${departments.size} departamentos, ${provinces.size} provincias, ${districts.size} distritos.`,
  );
};
