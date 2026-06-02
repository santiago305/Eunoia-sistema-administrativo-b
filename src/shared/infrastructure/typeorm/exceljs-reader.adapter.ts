import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { ExcelReaderPort, ExcelRow } from "src/shared/domain/ports/excel-reader.port";

@Injectable()
export class ExceljsReaderAdapter implements ExcelReaderPort {
  async read(buffer: Express.Multer.File["buffer"]): Promise<ExcelRow[]> {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) return [];

    const headers: string[] = [];

    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value ?? "").trim();
    });

    const rows: ExcelRow[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const item: ExcelRow = {};

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const key = headers[colNumber];

        if (!key) return;

        item[key] = this.normalizeCellValue(cell.value);
      });

      rows.push(item);
    });

    return rows;
  }

  private normalizeCellValue(value: ExcelJS.CellValue): string | number | boolean | null {
    if (value === null || value === undefined) return null;

    if (typeof value === "string") return value.trim();

    if (typeof value === "number" || typeof value === "boolean") return value;

    if (value instanceof Date) return value.toISOString();

    if (typeof value === "object") {
      if ("text" in value) return String(value.text).trim();

      if ("result" in value) {
        return this.normalizeCellValue(value.result as ExcelJS.CellValue);
      }

      if ("richText" in value) {
        return value.richText.map((item) => item.text).join("").trim();
      }
    }

    return String(value).trim();
  }
}