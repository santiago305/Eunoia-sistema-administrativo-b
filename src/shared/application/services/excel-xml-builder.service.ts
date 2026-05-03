export type ExcelXmlColumn = {
  key: string;
  header: string;
};

type ExcelXmlSheetInput = {
  sheetName: string;
  columns: ExcelXmlColumn[];
  rows: Record<string, unknown>[];
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function asCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export class ExcelXmlBuilderService {
  build({ sheetName, columns, rows }: ExcelXmlSheetInput): string {
    const safeSheetName = escapeXml(sheetName.slice(0, 31) || "Sheet1");
    const headerRow = columns
      .map((column) => `<Cell><Data ss:Type="String">${escapeXml(column.header)}</Data></Cell>`)
      .join("");

    const bodyRows = rows
      .map((row) => {
        const cells = columns
          .map((column) => {
            const value = asCellValue(row[column.key]);
            return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
          })
          .join("");
        return `<Row>${cells}</Row>`;
      })
      .join("");

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="${safeSheetName}">
  <Table>
   <Row>${headerRow}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;
  }
}

