import { fixMojibake } from "src/modules/excel/application/orders-import/normalization";

export type SourceRecognitionMatcher = {
  sourceId: string;
  sourceName: string;
  code: string;
};

export type SourceRecognitionMatch = SourceRecognitionMatcher & {
  advertisingCode: string | null;
};

type NormalizedText = {
  value: string;
  originalEndOffsets: number[];
};

export function normalizeSourceRecognitionCode(value: unknown): string {
  return normalizeWithOffsets(fixMojibake(String(value ?? "")).trim()).value;
}

export function matchSourceRecognitionCode(
  note: unknown,
  matchers: SourceRecognitionMatcher[],
): SourceRecognitionMatch | null {
  const original = fixMojibake(String(note ?? "")).trim();
  if (!original) return null;

  const normalizedNote = normalizeWithOffsets(original);
  const candidates = matchers
    .map((matcher) => ({
      ...matcher,
      normalizedCode: normalizeSourceRecognitionCode(matcher.code),
    }))
    .filter((matcher) => Boolean(matcher.normalizedCode))
    .sort(
      (left, right) =>
        right.normalizedCode.length - left.normalizedCode.length ||
        left.normalizedCode.localeCompare(right.normalizedCode),
    );

  for (const candidate of candidates) {
    if (!normalizedNote.value.startsWith(candidate.normalizedCode)) continue;

    const nextCharacter = normalizedNote.value[candidate.normalizedCode.length];
    if (nextCharacter && !/[\s|:;,_\-–—./]/u.test(nextCharacter)) continue;

    const lastCodeIndex = candidate.normalizedCode.length - 1;
    const originalEnd = normalizedNote.originalEndOffsets[lastCodeIndex] ?? 0;
    const advertisingCode = original
      .slice(originalEnd)
      .replace(/^[\s|:;,_\-–—.\/]+/u, "")
      .trim();

    return {
      sourceId: candidate.sourceId,
      sourceName: candidate.sourceName,
      code: candidate.code,
      advertisingCode: advertisingCode || null,
    };
  }

  return null;
}

function normalizeWithOffsets(original: string): NormalizedText {
  let value = "";
  const originalEndOffsets: number[] = [];
  let pendingSpaceEnd: number | null = null;

  for (let index = 0; index < original.length; ) {
    const character = String.fromCodePoint(original.codePointAt(index)!);
    const characterEnd = index + character.length;
    const decomposed = character
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

    if (/\s/u.test(decomposed)) {
      if (value && !value.endsWith(" ")) pendingSpaceEnd = characterEnd;
      index = characterEnd;
      continue;
    }

    if (pendingSpaceEnd !== null) {
      value += " ";
      originalEndOffsets.push(pendingSpaceEnd);
      pendingSpaceEnd = null;
    }

    for (const normalizedCharacter of decomposed) {
      value += normalizedCharacter;
      originalEndOffsets.push(characterEnd);
    }

    index = characterEnd;
  }

  return { value, originalEndOffsets };
}
