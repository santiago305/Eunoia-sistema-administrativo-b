export class RoleId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new Error('RoleId invalido');
    }
    this.value = normalized;
  }
}
