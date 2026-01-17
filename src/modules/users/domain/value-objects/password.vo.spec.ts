import { Password } from './password.vo';
import { InvalidPasswordError } from '../errors/invalid-password.error';

describe('Password', () => {
  it('stores value', () => {
    const password = new Password('hashed');
    expect(password.value).toBe('hashed');
  });

  it('throws on empty value', () => {
    expect(() => new Password('')).toThrow(InvalidPasswordError);
  });
});
