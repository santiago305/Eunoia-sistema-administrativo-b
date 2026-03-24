import { InvalidCompanyRucError } from "../errors/invalid-company-ruc.errors";


export class CompanyRuc {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();

    if (!/^\d{11}$/.test(normalized)) {
      throw new InvalidCompanyRucError();
    }

    this.value = normalized;
  }
}