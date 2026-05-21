import { InvalidClientError } from "../errors/invalid-client.error";

export class UbigeoDistrictId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized || normalized.length !== 6) {
      throw new InvalidClientError("DistrictId invalido");
    }
    this.value = normalized;
  }
}

