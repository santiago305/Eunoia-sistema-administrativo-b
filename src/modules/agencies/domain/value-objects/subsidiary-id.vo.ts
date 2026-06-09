import { InvalidIdError } from "../errors/invalid-id.errors";

export class SubsidiaryId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new InvalidIdError();
    }
    this.value = normalized;
  }
}
