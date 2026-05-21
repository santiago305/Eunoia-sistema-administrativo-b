import { InvalidClientError } from "../errors/invalid-client.error";

export class UbigeoProvinceId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized || normalized.length !== 4) {
      throw new InvalidClientError("ProvinceId invalido");
    }
    this.value = normalized;
  }
}

