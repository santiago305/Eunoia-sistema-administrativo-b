import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  const createContext = (req: Partial<Request>, handler = jest.fn(), controller = class {}) =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => handler,
      getClass: () => controller,
    }) as unknown as ExecutionContext;

  const createGuard = (skip = false) =>
    new CsrfGuard({
      getAllAndOverride: jest.fn().mockReturnValue(skip),
    } as unknown as Reflector);

  it('allows safe methods without csrf validation', () => {
    const guard = createGuard();
    const context = createContext({ method: 'GET', cookies: {} });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows unsafe methods authenticated without cookies', () => {
    const guard = createGuard();
    const context = createContext({
      method: 'POST',
      cookies: {},
      headers: { authorization: 'Bearer token' },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects unsafe methods with cookie auth and invalid csrf token', () => {
    const guard = createGuard();
    const context = createContext({
      method: 'PATCH',
      cookies: { access_token: 'jwt', csrf_token: 'cookie-token' },
      headers: { 'x-csrf-token': 'other-token' },
    });

    expect(() => guard.canActivate(context)).toThrow('CSRF token invalido o ausente');
  });

  it('allows unsafe methods with cookie auth and matching csrf token', () => {
    const guard = createGuard();
    const context = createContext({
      method: 'DELETE',
      cookies: { access_token: 'jwt', csrf_token: 'csrf-token' },
      headers: { 'x-csrf-token': 'csrf-token' },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows routes explicitly marked to skip csrf', () => {
    const guard = createGuard(true);
    const context = createContext({
      method: 'POST',
      cookies: { access_token: 'jwt' },
      headers: {},
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
