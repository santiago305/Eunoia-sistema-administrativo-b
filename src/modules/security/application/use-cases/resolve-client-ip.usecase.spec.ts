import { envs } from 'src/infrastructure/config/envs';
import { ResolveClientIpUseCase } from './resolve-client-ip.usecase';

describe('ResolveClientIpUseCase', () => {
  const originalTrustProxy = envs.trustProxy;
  const originalNodeEnv = envs.nodeEnv;
  const useCase = new ResolveClientIpUseCase();

  afterEach(() => {
    envs.trustProxy = originalTrustProxy;
    envs.nodeEnv = originalNodeEnv;
  });

  it('uses Express resolved client IP when the trusted production proxy is enabled', () => {
    envs.trustProxy = true;
    envs.nodeEnv = 'production';

    const result = useCase.execute({
      headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.10' },
      ip: '198.51.100.7',
      socket: { remoteAddress: '10.0.0.10' },
    } as any);

    expect(result).toBe('198.51.100.7');
  });

  it('does not trust a forwarded header when no proxy is configured', () => {
    envs.trustProxy = false;
    envs.nodeEnv = 'production';

    const result = useCase.execute({
      headers: { 'x-forwarded-for': '198.51.100.7' },
      ip: '198.51.100.7',
      socket: { remoteAddress: '::ffff:10.0.0.10' },
    } as any);

    expect(result).toBe('10.0.0.10');
  });
});
