import { InvalidAgencyError } from "../errors/invalid-agency.error";

export class UbigeoDepartmentId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized || normalized.length !== 2) {
      throw new InvalidAgencyError("DepartmentId invalido");
    }
    this.value = normalized;
  }
}

