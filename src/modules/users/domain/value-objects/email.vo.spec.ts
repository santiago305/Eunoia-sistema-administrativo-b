import { Email } from './email.vo';
import { InvalidEmailError } from '../errors/invalid-email.error';

describe('Email', () => {
  it('normalizes and stores value', () => {
    const email = new Email('  test@example.com  ');
    expect(email.value).toBe('test@example.com');
  });

  it('throws on invalid value', () => {
    expect(() => new Email('invalid')).toThrow(InvalidEmailError);
  });
});
