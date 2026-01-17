export class Email {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized || !normalized.includes('@')) {
      throw new Error('Email invalido');
    }
    this.value = normalized;
  }
}
