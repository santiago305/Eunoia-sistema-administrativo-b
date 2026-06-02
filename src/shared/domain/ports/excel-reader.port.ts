export const EXCEL_READER = Symbol("EXCEL_READER");

export type ExcelRow = Record<string, string | number | boolean | null>;

export interface ExcelReaderPort {
  read(buffer: Express.Multer.File["buffer"]): Promise<ExcelRow[]>;
}