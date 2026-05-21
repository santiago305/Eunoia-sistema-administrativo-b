import { InvalidPackError } from "../errors/invalid-pack.error";

export class PackItemId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new InvalidPackError("Id de item invalido");
    }
    this.value = normalized;
  }
}

