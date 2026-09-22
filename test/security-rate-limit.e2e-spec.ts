import { Controller, Get, INestApplication, Logger, UseGuards } from '@nestjs/common';
import { getStorageToken, SkipThrottle, ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { SecurityThrottlerGuard } from 'src/modules/security/adapters/in/guards/security-throttler.guard';
import { IpBan } from 'src/modules/security/adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { IpViolation } from 'src/modules/security/adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { RegisterIpViolationAndApplyPolicyUseCase } from 'src/modules/security/application/use-cases/register-ip-violation-and-apply-policy.usecase';
import { ResolveClientIpUseCase } from 'src/modules/security/application/use-cases/resolve-client-ip.usecase';
import { RedisThrottlerStorage } from 'src/modules/security/infrastructure/providers/redis-throttler.storage';
import { ResolveRateLimitTrackerUseCase } from 'src/modules/security/application/use-cases/resolve-rate-limit-tracker.usecase';

@Controller('security-rate-limit-e2e')
@UseGuards(SecurityThrottlerGuard)
class SecurityRateLimitE2eController {
  @Get('normal')
  normal() {
    return { status: 'ok' };
  }

  @Get('health')
  @SkipThrottle()
  health() {
    return { status: 'ok' };
  }
}

class MemoryThrottlerStorage implements ThrottlerStorage {
  private readonly hits = new Map<string, number>();

  async increment(key: string, ttl: number, limit: number) {
    const totalHits = (this.hits.get(key) ?? 0) + 1;
    this.hits.set(key, totalHits);

    return {
      totalHits,
      timeToExpire: Math.ceil(ttl / 1000),
      isBlocked: totalHits > limit,
      timeToBlockExpire: totalHits > limit ? Math.ceil(ttl / 1000) : 0,
    };
  }
}

describe('security rate limit (e2e)', () => {
  let app: INestApplication;
  const violations: Array<Record<string, unknown>> = [];
  let savedBan: Record<string, unknown> | null = null;

  beforeEach(async () => {
    violations.length = 0;
    savedBan = null;

    const violationRepository = {
      create: jest.fn((value) => ({ ...value, createdAt: new Date() })),
      save: jest.fn(async (value) => {
        if (!violations.includes(value)) violations.push(value);
        return value;
      }),
      count: jest.fn(async () => violations.length),
    };
    const banRepository = {
      create: jest.fn((value) => ({ ...value })),
      findOne: jest.fn(async () => savedBan),
      save: jest.fn(async (value) => {
        savedBan = value;
        return value;
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 2 }])],
      controllers: [SecurityRateLimitE2eController],
      providers: [
        SecurityThrottlerGuard,
        ResolveClientIpUseCase,
        RegisterIpViolationAndApplyPolicyUseCase,
        { provide: getStorageToken(), useClass: MemoryThrottlerStorage },
        { provide: RedisThrottlerStorage, useValue: { buildTrackerKeySuffix: (value: string) => value, claimFirstBlockEvent: jest.fn().mockResolvedValue(true), linkTrackerToIp: jest.fn() } },
        { provide: ResolveRateLimitTrackerUseCase, useValue: { executePrimary: jest.fn(async () => ({ tracker: 'ip:127.0.0.1', trackerType: 'ip', userId: null, sessionId: null })), executeIp: jest.fn(() => ({ tracker: 'ip:127.0.0.1', trackerType: 'ip', userId: null, sessionId: null })), describeTracker: jest.fn((tracker: string) => ({ tracker, trackerType: 'ip', userId: null, sessionId: null })) } },
        { provide: getRepositoryToken(IpViolation), useValue: violationRepository },
        { provide: getRepositoryToken(IpBan), useValue: banRepository },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('keeps normal navigation below the limit and excludes healthchecks', async () => {
    await request(app.getHttpServer()).get('/security-rate-limit-e2e/normal').expect(200);
    await request(app.getHttpServer()).get('/security-rate-limit-e2e/normal').expect(200);
    await request(app.getHttpServer()).get('/security-rate-limit-e2e/health').expect(200);
    await request(app.getHttpServer()).get('/security-rate-limit-e2e/health').expect(200);

    expect(violations).toHaveLength(0);
  });

  it('returns 429, records a structured event and escalates to the first temporary ban', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    await request(app.getHttpServer()).get('/security-rate-limit-e2e/normal').expect(200);
    await request(app.getHttpServer()).get('/security-rate-limit-e2e/normal').expect(200);
    await request(app.getHttpServer()).get('/security-rate-limit-e2e/normal').expect(429);
    await request(app.getHttpServer()).get('/security-rate-limit-e2e/normal').expect(429);
    await request(app.getHttpServer()).get('/security-rate-limit-e2e/normal').expect(429);

    expect(violations).toHaveLength(3);
    expect(savedBan).toEqual(
      expect.objectContaining({
        banLevel: 1,
        lastReason: 'rate_limit_exceeded',
      }),
    );
    expect(warnSpy).toHaveBeenLastCalledWith(
      expect.stringContaining('"event":"rate_limit_exceeded"'),
    );
    expect(warnSpy).toHaveBeenLastCalledWith(
      expect.stringContaining('"path":"/security-rate-limit-e2e/normal"'),
    );
  });
});
