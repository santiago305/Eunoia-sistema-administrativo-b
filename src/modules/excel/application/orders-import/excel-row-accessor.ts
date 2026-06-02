import type { ExcelRow } from "src/shared/domain/ports/excel-reader.port";
import { fixMojibake, normalizeTextForMatch } from "./normalization";

export class ExcelRowAccessor {
  private readonly byNorm = new Map<string, string>();

  constructor(private readonly row: ExcelRow) {
    for (const key of Object.keys(row)) {
      const fixed = fixMojibake(key);
      this.byNorm.set(normalizeTextForMatch(key), key);
      this.byNorm.set(normalizeTextForMatch(fixed), key);
    }
  }

  get(rawHeaderOrSynonyms: string | string[]): unknown {
    const list = Array.isArray(rawHeaderOrSynonyms)
      ? rawHeaderOrSynonyms
      : [rawHeaderOrSynonyms];

    for (const header of list) {
      const key = this.byNorm.get(normalizeTextForMatch(header));
      if (key) return (this.row as any)[key];
    }

    return undefined;
  }
}

