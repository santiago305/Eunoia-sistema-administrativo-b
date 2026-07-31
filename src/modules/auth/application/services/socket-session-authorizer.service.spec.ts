import { SocketSessionAuthorizerService } from './socket-session-authorizer.service';

describe('SocketSessionAuthorizerService', () => {
  const make = (permissions = ['sale_orders.view']) => {
    const jwt = { verify: jest.fn().mockReturnValue({ sub: 'user-1', sessionId: 'session-1' }) };
    const sessions = { findByIdAndUserId: jest.fn().mockResolvedValue({ revokedAt: null, expiresAt: new Date(Date.now() + 60_000) }) };
    const access = { getEffectivePermissions: jest.fn().mockResolvedValue(permissions) };
    return { jwt, sessions, access, service: new SocketSessionAuthorizerService(jwt as any, sessions as any, access as any) };
  };

  it.each([
    ['no cookie', {}],
    ['invalid token', { cookie: 'access_token=bad' }],
  ])('rejects %s', async (_name, headers) => {
    const { service, jwt } = make();
    if ((headers as any).cookie) jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    await expect(service.authorize({ headers } as any, 'sale-orders')).resolves.toBeNull();
  });

  it('ignores handshake userId and returns the signed subject', async () => {
    const { service, access } = make();
    await expect(service.authorize({ headers: { cookie: 'foo=1; access_token=jwt' }, auth: { userId: 'attacker' } } as any, 'sale-orders'))
      .resolves.toEqual({ userId: 'user-1', sessionId: 'session-1' });
    expect(access.getEffectivePermissions).toHaveBeenCalledWith('user-1');
  });

  it('requires workflow management for workflow reactivity', async () => {
    const { service } = make(['sale_orders.view']);
    await expect(service.authorize({ headers: { cookie: 'access_token=jwt' } } as any, 'workflow-reactivity')).resolves.toBeNull();
  });
});
