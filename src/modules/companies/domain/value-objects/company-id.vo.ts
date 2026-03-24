import { InvalidCompanyIdError } from "../errors/invalid-company-id.error";

export class CompanyId {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();

    if (!normalized) {
      throw new InvalidCompanyIdError("El id de la empresa es obligatorio");
    }

    if (!CompanyId.UUID_REGEX.test(normalized)) {
      throw new InvalidCompanyIdError("El id de la empresa debe ser un UUID valido");
    }

    this.value = normalized;
  }
}
