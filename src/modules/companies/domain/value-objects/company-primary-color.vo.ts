export const DEFAULT_COMPANY_PRIMARY_COLOR = "#21B5A6";

export class CompanyPrimaryColor {
  public readonly value: string;

  constructor(value: string = DEFAULT_COMPANY_PRIMARY_COLOR) {
    const normalized = value?.trim().toUpperCase();

    if (!/^#[0-9A-F]{6}$/.test(normalized)) {
      throw new Error("El color principal de la empresa es invÃ¡lido");
    }

    this.value = normalized;
  }
}
