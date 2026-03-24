export class CompanyName {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();

    if (!normalized) {
      throw new Error("El nombre de la empresa es obligatorio");
    }

    if (normalized.length < 3) {
      throw new Error("El nombre de la empresa debe tener al menos 3 caracteres");
    }

    if (normalized.length > 150) {
      throw new Error("El nombre de la empresa no debe exceder los 150 caracteres");
    }

    this.value = normalized;
  }
}