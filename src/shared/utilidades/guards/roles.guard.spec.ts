import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleType } from '../../constantes/constants';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const makeContext = (user: unknown): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  it('does not log authenticated user payload', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleType.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    expect(guard.canActivate(makeContext({ role: RoleType.ADMIN, id: 'user-1' }))).toBe(true);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('rejects users without required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleType.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(makeContext({ role: RoleType.ADVISER }))).toThrow(ForbiddenException);
  });
});
