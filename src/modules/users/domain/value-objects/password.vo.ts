import { InvalidPasswordError } from '../errors/invalid-password.error';

export class Password {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new InvalidPasswordError();
    }
    this.value = normalized;
  }
}
