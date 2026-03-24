import { InvalidCompanyEmailError } from "../errors/invalid-company-email.error";

export class CompanyEmail {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim().toLowerCase();

    if (!normalized) {
      throw new InvalidCompanyEmailError();
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalized)) {
      throw new InvalidCompanyEmailError();
    }

    this.value = normalized;
  }
}