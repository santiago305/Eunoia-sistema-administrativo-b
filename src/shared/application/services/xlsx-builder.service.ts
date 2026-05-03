import ExcelJS from "exceljs";

export type XlsxColumn = {
  key: string;
  header: string;
};

type BuildXlsxInput = {
  sheetName: string;
  columns: XlsxColumn[];
  rows: Record<string, unknown>[];
};

function normalizeCellValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return formatLocalDateTime(value);
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime()) && /[tT:\-]/.test(value)) {
      return formatLocalDateTime(parsed);
    }
    return value;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value);
}

function formatLocalDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export class XlsxBuilderService {
  async build(input: BuildXlsxInput): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(input.sheetName.slice(0, 31) || "Sheet1");
    worksheet.columns = input.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: Math.max(14, Math.min(42, column.header.length + 4)),
    }));

    input.rows.forEach((row) => {
      const normalized: Record<string, string | number | boolean | null> = {};
      input.columns.forEach((column) => {
        normalized[column.key] = normalizeCellValue(row[column.key]);
      });
      worksheet.addRow(normalized);
    });

    const header = worksheet.getRow(1);
    header.font = { bold: true };
    header.alignment = { vertical: "middle", horizontal: "left" };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }
}
