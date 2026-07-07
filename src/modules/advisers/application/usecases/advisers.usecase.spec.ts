import { existsSync } from 'fs';
import { join } from 'path';

const listPath = join(__dirname, 'list-advisers.usecase');
const createPath = join(__dirname, 'create-adviser.usecase');

describe('adviser use cases', () => {
  it('lists only active users classified as advisers', async () => {
    expect(existsSync(`${listPath}.ts`)).toBe(true);
    if (!existsSync(`${listPath}.ts`)) return;

    const { ListAdvisersUsecase } = require(listPath) as {
      ListAdvisersUsecase: new (
        advisers: unknown,
        users: unknown,
      ) => { execute(): Promise<unknown> };
    };
    const advisers = {
      find: jest
        .fn()
        .mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]),
    };
    const users = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'user-1',
          name: 'Ana',
          email: 'ana@example.com',
          deleted: false,
        },
      ]),
    };

    await expect(
      new ListAdvisersUsecase(advisers, users).execute(),
    ).resolves.toEqual([
      { id: 'user-1', name: 'Ana', email: 'ana@example.com' },
    ]);
  });

  it('classifies an existing active user idempotently', async () => {
    expect(existsSync(`${createPath}.ts`)).toBe(true);
    if (!existsSync(`${createPath}.ts`)) return;

    const { CreateAdviserUsecase } = require(createPath) as {
      CreateAdviserUsecase: new (
        advisers: unknown,
        users: unknown,
      ) => { execute(input: { userId: string }): Promise<unknown> };
    };
    const advisers = {
      findOneBy: jest.fn().mockResolvedValue({ userId: 'user-1' }),
      save: jest.fn(),
    };
    const users = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        deleted: false,
      }),
    };

    await expect(
      new CreateAdviserUsecase(advisers, users).execute({
        userId: 'user-1',
      }),
    ).resolves.toEqual({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
    });
    expect(advisers.save).not.toHaveBeenCalled();
  });
});
