export interface NormalizedProductName {
  displayName: string;
  normalizedName: string;
}

export function normalizeProductName(value: string): NormalizedProductName {
  const collapsed = value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("es");
  const normalizedName = collapsed
    .replace(/[áàäâãå]/gu, "a")
    .replace(/[éèëê]/gu, "e")
    .replace(/[íìïî]/gu, "i")
    .replace(/[óòöôõ]/gu, "o")
    .replace(/[úùüû]/gu, "u");

  return {
    normalizedName,
    displayName: collapsed
      ? collapsed[0].toLocaleUpperCase("es") + collapsed.slice(1)
      : collapsed,
  };
}
