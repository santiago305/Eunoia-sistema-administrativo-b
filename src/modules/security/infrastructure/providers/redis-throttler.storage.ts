import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';
import { envs } from 'src/infrastructure/config/envs';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: envs.redis.host,
      port: envs.redis.port,
      password: envs.redis.password || undefined,
      db: envs.redis.db,
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const hitsKey = `throttle:${throttlerName}:hits:${key}`;
    const blockKey = `throttle:${throttlerName}:block:${key}`;

    const blockTtlMs = await this.redis.pttl(blockKey);
    const currentlyBlocked = blockTtlMs > 0;

    if (currentlyBlocked) {
      const totalHitsRaw = await this.redis.get(hitsKey);
      const totalHits = Number(totalHitsRaw || 0);
      return {
        totalHits,
        timeToExpire: this.toSeconds(await this.redis.pttl(hitsKey)),
        isBlocked: true,
        timeToBlockExpire: this.toSeconds(blockTtlMs),
      };
    }

    const totalHits = await this.redis.incr(hitsKey);
    if (totalHits === 1) {
      await this.redis.pexpire(hitsKey, ttl);
    }

    const hitsTtlMs = await this.redis.pttl(hitsKey);
    let isBlocked = false;
    let timeToBlockExpire = 0;

    if (totalHits > limit) {
      await this.redis.set(blockKey, '1', 'PX', blockDuration);
      isBlocked = true;
      timeToBlockExpire = this.toSeconds(await this.redis.pttl(blockKey));
    }

    return {
      totalHits,
      timeToExpire: this.toSeconds(hitsTtlMs),
      isBlocked,
      timeToBlockExpire,
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private toSeconds(ms: number): number {
    if (!Number.isFinite(ms) || ms <= 0) return 0;
    return Math.ceil(ms / 1000);
  }
}
