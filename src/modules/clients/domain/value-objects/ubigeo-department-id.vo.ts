import { InvalidClientError } from "../errors/invalid-client.error";

export class UbigeoDepartmentId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized || normalized.length !== 2) {
      throw new InvalidClientError("DepartmentId invalido");
    }
    this.value = normalized;
  }
}

