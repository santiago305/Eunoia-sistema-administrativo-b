import { InvalidPackError } from "../errors/invalid-pack.error";

export class PackId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new InvalidPackError("Id de pack invalido");
    }
    this.value = normalized;
  }
}

