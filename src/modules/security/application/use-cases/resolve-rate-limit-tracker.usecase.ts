import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { envs } from 'src/infrastructure/config/envs';
import { ResolveClientIpUseCase } from './resolve-client-ip.usecase';
import { createHash } from 'crypto';

export type RateLimitTrackerIdentity = {
  tracker: string;
  trackerType: 'session' | 'login' | 'ip';
  userId: string | null;
  sessionId: string | null;
};

type AccessTokenPayload = {
  sub?: unknown;
  sessionId?: unknown;
};

@Injectable()
export class ResolveRateLimitTrackerUseCase {
  private readonly resolvedByRequest = new WeakMap<
    Request,
    Promise<RateLimitTrackerIdentity>
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly resolveClientIpUseCase: ResolveClientIpUseCase,
  ) {}

  executePrimary(req: Request): Promise<RateLimitTrackerIdentity> {
    const cached = this.resolvedByRequest.get(req);
    if (cached) return cached;

    const resolution = this.resolveVerifiedSessionOrIp(req);
    this.resolvedByRequest.set(req, resolution);
    return resolution;
  }

  executeIp(req: Request): RateLimitTrackerIdentity {
    return {
      tracker: this.resolveClientIpUseCase.execute(req),
      trackerType: 'ip',
      userId: null,
      sessionId: null,
    };
  }

  describeTracker(tracker: string): RateLimitTrackerIdentity {
    const match = /^session:([^:]+):user:([^:]+)$/.exec(tracker);
    if (!match) {
      if (/^login:account:[a-f0-9]{64}:ip:[a-f0-9]{64}$/.test(tracker)) {
        return {
          tracker,
          trackerType: 'login',
          userId: null,
          sessionId: null,
        };
      }

      return {
        tracker,
        trackerType: 'ip',
        userId: null,
        sessionId: null,
      };
    }

    return {
      tracker,
      trackerType: 'session',
      sessionId: match[1],
      userId: match[2],
    };
  }

  private async resolveVerifiedSessionOrIp(
    req: Request,
  ): Promise<RateLimitTrackerIdentity> {
    if (this.isAuthRoute(req, 'login')) {
      return this.resolveLoginTracker(req);
    }

    const token = this.extractSessionToken(req);
    if (!token) return this.executeIp(req);

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: envs.jwt.secret,
          issuer: envs.jwt.issuer,
        },
      );
      if (
        typeof payload.sub !== 'string' ||
        !payload.sub.trim() ||
        typeof payload.sessionId !== 'string' ||
        !payload.sessionId.trim()
      ) {
        return this.executeIp(req);
      }

      const userId = payload.sub.trim();
      const sessionId = payload.sessionId.trim();
      return {
        tracker: `session:${sessionId}:user:${userId}`,
        trackerType: 'session',
        userId,
        sessionId,
      };
    } catch {
      return this.executeIp(req);
    }
  }

  private extractSessionToken(req: Request): string | null {
    const cookieToken =
      req.signedCookies?.access_token || req.cookies?.access_token;
    if (typeof cookieToken === 'string' && cookieToken.trim()) {
      return cookieToken.trim();
    }

    if (this.isAuthRoute(req, 'refresh')) {
      const refreshToken =
        req.signedCookies?.refresh_token || req.cookies?.refresh_token;
      if (typeof refreshToken === 'string' && refreshToken.trim()) {
        return refreshToken.trim();
      }
    }

    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string') return null;
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    return match?.[1]?.trim() || null;
  }

  private resolveLoginTracker(req: Request): RateLimitTrackerIdentity {
    const ip = this.resolveClientIpUseCase.execute(req);
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    if (!email) return this.executeIp(req);

    const accountHash = createHash('sha256').update(email).digest('hex');
    const ipHash = createHash('sha256').update(ip).digest('hex');
    return {
      tracker: `login:account:${accountHash}:ip:${ipHash}`,
      trackerType: 'login',
      userId: null,
      sessionId: null,
    };
  }

  private isAuthRoute(req: Request, action: 'login' | 'refresh'): boolean {
    const path = req.path || req.originalUrl || '';
    return new RegExp(`(?:^|/)auth/${action}(?:$|[/?#])`).test(path);
  }
}
