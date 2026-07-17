import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtRefreshAuthGuard } from './jwt-refresh-auth.guard';

describe('JwtRefreshAuthGuard', () => {
  it('clears auth cookies when refresh token cannot be authenticated', () => {
    const guard = new JwtRefreshAuthGuard();
    const clearCookie = jest.fn();
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({ clearCookie }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.handleRequest(new Error('jwt expired'), null, undefined, context)).toThrow(
      UnauthorizedException,
    );
    expect(clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(clearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(clearCookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.objectContaining({ httpOnly: false, path: '/' }),
    );
  });
});
