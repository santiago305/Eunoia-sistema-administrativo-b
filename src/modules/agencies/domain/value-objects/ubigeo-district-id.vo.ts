import { InvalidAgencyError } from "../errors/invalid-agency.error";

export class UbigeoDistrictId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized || normalized.length !== 6) {
      throw new InvalidAgencyError("DistrictId invalido");
    }
    this.value = normalized;
  }
}

