import ExcelJS from "exceljs";
import { ExportAgenciesExcelUsecase } from "./export-excel.usecase";

describe("ExportAgenciesExcelUsecase", () => {
  const agencyRepo = {
    list: jest.fn(async () => ({
      total: 1,
      items: [
        {
          agencyId: { value: "agency-1" },
          name: "Shalom",
          description: "Principal",
          isActive: true,
          __subsidiaries: [
            {
              alias: "Lima",
              departmentId: { value: "15" },
              provinceId: { value: "1501" },
              districtId: { value: "150101" },
              address: "Av Peru",
              basePrice: 12,
              isActive: true,
            },
            {
              alias: "Arequipa",
              departmentId: { value: "04" },
              provinceId: { value: "0401" },
              districtId: { value: "040101" },
              address: "Av Ejercito",
              basePrice: 18,
              isActive: true,
            },
          ],
        },
      ],
    })),
  };
  const ubigeoRepo = {
    getCatalog: jest.fn(async () => ({
      departments: [
        { id: "15", name: "Lima" },
        { id: "04", name: "Arequipa" },
      ],
      provinces: [
        { id: "1501", name: "Lima", departmentId: "15" },
        { id: "0401", name: "Arequipa", departmentId: "04" },
      ],
      districts: [
        { id: "150101", name: "Lima", provinceId: "1501", departmentId: "15" },
        { id: "040101", name: "Arequipa", provinceId: "0401", departmentId: "04" },
      ],
    })),
  };

  it("returns only subsidiary export columns", () => {
    const usecase = new ExportAgenciesExcelUsecase(agencyRepo as any, ubigeoRepo as any);

    expect(usecase.getAvailableColumns()).toEqual(
      [
        { key: "alias", label: "Alias" },
        { key: "department", label: "Departamento" },
        { key: "province", label: "Provincia" },
        { key: "district", label: "Distrito" },
        { key: "address", label: "Direccion" },
        { key: "basePrice", label: "Precio" },
      ],
    );
  });

  it("exports one row per subsidiary with only subsidiary data", async () => {
    const usecase = new ExportAgenciesExcelUsecase(agencyRepo as any, ubigeoRepo as any);

    const file = await usecase.execute({
      columns: usecase.getAvailableColumns(),
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.content);
    const worksheet = workbook.getWorksheet("Sucursales");

    expect(worksheet?.getRow(1).values).toEqual([
      ,
      "Alias",
      "Departamento",
      "Provincia",
      "Distrito",
      "Direccion",
      "Precio",
    ]);
    expect(worksheet?.getRow(2).values).toEqual([
      ,
      "Lima",
      "Lima",
      "Lima",
      "Lima",
      "Av Peru",
      12,
    ]);
    expect(worksheet?.getRow(3).values).toEqual([
      ,
      "Arequipa",
      "Arequipa",
      "Arequipa",
      "Arequipa",
      "Av Ejercito",
      18,
    ]);
    expect(worksheet?.getRow(4).hasValues).toBe(false);
  });

  it("rejects empty selected columns", async () => {
    const usecase = new ExportAgenciesExcelUsecase(agencyRepo as any, ubigeoRepo as any);

    await expect(usecase.execute({ columns: [] })).rejects.toThrow(
      "Debes seleccionar al menos una columna",
    );
  });
});
