import { InvalidCompanyPhoneError } from "../errors/invalid-company-phone.error";

export class CompanyPhone {
  private static readonly PHONE_REGEX = /^\+?\d{7,15}$/;

  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim()?.replace(/[\s()-]/g, "");

    if (!normalized) {
      throw new InvalidCompanyPhoneError("El telefono de la empresa es obligatorio");
    }

    if (!CompanyPhone.PHONE_REGEX.test(normalized)) {
      throw new InvalidCompanyPhoneError(
        "El telefono de la empresa debe contener solo digitos y puede incluir prefijo +",
      );
    }

    this.value = normalized;
  }
}
