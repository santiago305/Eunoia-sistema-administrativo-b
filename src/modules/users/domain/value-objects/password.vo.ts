export class Password {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new Error('Password invalida');
    }
    this.value = normalized;
  }
}
