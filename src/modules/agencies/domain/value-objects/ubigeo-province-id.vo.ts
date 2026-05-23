import { InvalidAgencyError } from "../errors/invalid-agency.error";

export class UbigeoProvinceId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized || normalized.length !== 4) {
      throw new InvalidAgencyError("ProvinceId invalido");
    }
    this.value = normalized;
  }
}

