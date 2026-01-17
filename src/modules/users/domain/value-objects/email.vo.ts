import { InvalidEmailError } from '../errors/invalid-email.error';

export class Email {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized || !normalized.includes('@')) {
      throw new InvalidEmailError();
    }
    this.value = normalized;
  }
}
