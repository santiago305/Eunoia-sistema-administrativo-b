export interface ImportCreateAgencyRowInput {
  department: string;
  province: string;
  district: string;
  address?: string | null;
  alias: string;
  price?: number | string | null;
}

export interface ImportCreateAgencyInput {
  rows: ImportCreateAgencyRowInput[];
}

export interface ImportCreateAgencySuccessRow {
  rowNumber: number;
  subsidiaryId: string;
  alias: string;
}

export interface ImportCreateAgencyErrorRow {
  rowNumber: number;
  alias?: string;
  message: string;
}

export interface ImportCreateAgencyOutput {
  totalRows: number;
  importedRows: number;
  failedRows: number;
  agencyId: string | null;
  rows: ImportCreateAgencySuccessRow[];
  errors: ImportCreateAgencyErrorRow[];
}
