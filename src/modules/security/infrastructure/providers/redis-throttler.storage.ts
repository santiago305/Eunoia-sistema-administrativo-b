import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { createHash } from 'crypto';
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
    await this.rememberTrackerKeys(key, [hitsKey, blockKey], Math.max(ttl, blockDuration));

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

  buildTrackerKeySuffix(tracker: string): string {
    return createHash('sha256').update(tracker).digest('hex');
  }

  async claimFirstBlockEvent(
    key: string,
    throttlerName: string,
    fallbackTtlMs: number,
  ): Promise<boolean> {
    const blockKey = `throttle:${throttlerName}:block:${key}`;
    const auditKey = `throttle:${throttlerName}:audit:${key}`;
    const blockTtlMs = await this.redis.pttl(blockKey);
    const ttlMs = Math.max(1, blockTtlMs > 0 ? blockTtlMs : fallbackTtlMs);
    await this.rememberTrackerKeys(key, [auditKey], ttlMs);
    const result = await this.redis.set(auditKey, '1', 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async clearTracker(tracker: string): Promise<number> {
    const trackerSuffix = this.buildTrackerKeySuffix(tracker);
    const aliasKey = this.getIpAliasKey(trackerSuffix);
    const linkedTrackerSuffixes = await this.redis.smembers(aliasKey);
    const trackerSuffixes = Array.from(
      new Set([trackerSuffix, ...linkedTrackerSuffixes]),
    );
    const indexKeys = trackerSuffixes.map((suffix) =>
      this.getTrackerIndexKey(suffix),
    );
    const keys = (
      await Promise.all(indexKeys.map((indexKey) => this.redis.smembers(indexKey)))
    ).flat();
    const safeKeys = keys.filter((key) => key.startsWith('throttle:'));
    const deleted = safeKeys.length ? await this.redis.del(...safeKeys) : 0;
    await this.redis.del(...indexKeys, aliasKey);
    return deleted;
  }

  async linkTrackerToIp(tracker: string, ip: string): Promise<void> {
    if (tracker === ip) return;
    const aliasKey = this.getIpAliasKey(this.buildTrackerKeySuffix(ip));
    await this.redis.sadd(aliasKey, this.buildTrackerKeySuffix(tracker));
    await this.redis.pexpire(aliasKey, 10 * 60_000);
  }

  private toSeconds(ms: number): number {
    if (!Number.isFinite(ms) || ms <= 0) return 0;
    return Math.ceil(ms / 1000);
  }

  private async rememberTrackerKeys(
    generatedKey: string,
    redisKeys: string[],
    ttlMs: number,
  ): Promise<void> {
    const trackerSuffix = generatedKey.split(':').at(-1);
    if (!trackerSuffix || !/^[a-f0-9]{64}$/.test(trackerSuffix)) return;

    const indexKey = this.getTrackerIndexKey(trackerSuffix);
    await this.redis.sadd(indexKey, ...redisKeys);
    await this.redis.pexpire(indexKey, Math.max(1, ttlMs + 60_000));
  }

  private getTrackerIndexKey(trackerSuffix: string): string {
    return `throttle:tracker:${trackerSuffix}:keys`;
  }

  private getIpAliasKey(ipSuffix: string): string {
    return `throttle:ip-alias:${ipSuffix}:trackers`;
  }
}
