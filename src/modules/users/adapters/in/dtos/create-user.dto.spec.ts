import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  const makeDto = (password: string) => {
    const dto = new CreateUserDto();
    dto.name = 'Ana';
    dto.email = 'ana@example.com';
    dto.password = password;
    dto.roleId = '550e8400-e29b-41d4-a716-446655440000';
    return dto;
  };

  it('rejects passwords shorter than 12 characters', async () => {
    const errors = await validate(makeDto('12345678'));

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it('accepts passwords with at least 12 characters', async () => {
    const errors = await validate(makeDto('123456789012'));

    expect(errors.find((error) => error.property === 'password')).toBeUndefined();
  });
});
