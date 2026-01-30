import { SessionFactory } from './session.factory';
import { Session } from '../entities/session.entity';

describe('SessionFactory', () => {
  describe('createNew', () => {
    it('should create a new session with undefined id', () => {
      const params = {
        userId: 'user-123',
        deviceId: 'device-456',
        deviceName: 'iPhone 13',
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1',
        refreshTokenHash: 'hash-token-xyz',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const session = SessionFactory.createNew(params);

      expect(session).toBeInstanceOf(Session);
      expect(session.id).toBeUndefined();
      expect(session.userId).toBe(params.userId);
      expect(session.deviceId).toBe(params.deviceId);
      expect(session.userAgent).toBe(params.userAgent);
      expect(session.ipAddress).toBe(params.ipAddress);
      expect(session.refreshTokenHash).toBe(params.refreshTokenHash);
      expect(session.expiresAt).toBe(params.expiresAt);
    });

    it('should set createdAt and lastSeenAt to current date', () => {
      const beforeCreation = new Date();
      const params = {
        userId: 'user-123',
        deviceId: 'device-456',
        deviceName: null,
        userAgent: null,
        ipAddress: null,
        refreshTokenHash: 'hash-token-xyz',
        expiresAt: new Date(),
      };

      const session = SessionFactory.createNew(params);
      const afterCreation = new Date();

      expect(session.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(session.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
      expect(session.lastSeenAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(session.lastSeenAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('should set revokedAt to null', () => {
      const params = {
        userId: 'user-123',
        deviceId: 'device-456',
        deviceName: 'Chrome',
        userAgent: 'Mozilla/5.0...',
        ipAddress: '10.0.0.1',
        refreshTokenHash: 'hash-xyz',
        expiresAt: new Date(),
      };

      const session = SessionFactory.createNew(params);

    });

    it('should handle null values for optional fields', () => {
      const params = {
        userId: 'user-123',
        deviceId: 'device-456',
        deviceName: null,
        userAgent: null,
        ipAddress: null,
        refreshTokenHash: 'hash-token-xyz',
        expiresAt: new Date(),
      };

      const session = SessionFactory.createNew(params);

      expect(session.userAgent).toBeNull();
      expect(session.ipAddress).toBeNull();
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute a session with all fields', () => {
      const createdAt = new Date('2025-01-01');
      const lastSeenAt = new Date('2025-01-15');
      const revokedAt = null;
      const expiresAt = new Date('2025-02-01');

      const params = {
        id: 'session-123',
        userId: 'user-456',
        deviceId: 'device-789',
        deviceName: 'MacBook Pro',
        userAgent: 'Safari/537.36',
        ipAddress: '203.0.113.45',
        refreshTokenHash: 'hash-abc123',
        createdAt,
        lastSeenAt,
        revokedAt,
        expiresAt,
      };

      const session = SessionFactory.reconstitute(params);

      expect(session).toBeInstanceOf(Session);
      expect(session.id).toBe(params.id);
      expect(session.userId).toBe(params.userId);
      expect(session.deviceId).toBe(params.deviceId);
      expect(session.userAgent).toBe(params.userAgent);
      expect(session.ipAddress).toBe(params.ipAddress);
      expect(session.refreshTokenHash).toBe(params.refreshTokenHash);
      expect(session.createdAt).toBe(createdAt);
      expect(session.lastSeenAt).toBe(lastSeenAt);
      expect(session.expiresAt).toBe(expiresAt);
    });

    it('should reconstitute a revoked session', () => {
      const revokedAt = new Date('2025-01-20');
      const params = {
        id: 'session-123',
        userId: 'user-456',
        deviceId: 'device-789',
        deviceName: 'iPhone',
        userAgent: 'Mobile Safari',
        ipAddress: '198.51.100.1',
        refreshTokenHash: 'hash-def456',
        createdAt: new Date('2025-01-01'),
        lastSeenAt: new Date('2025-01-19'),
        revokedAt,
        expiresAt: new Date('2025-02-01'),
      };

      const session = SessionFactory.reconstitute(params);

    });

    it('should handle null values for optional fields in reconstitute', () => {
      const params = {
        id: 'session-123',
        userId: 'user-456',
        deviceId: 'device-789',
        deviceName: null,
        userAgent: null,
        ipAddress: null,
        refreshTokenHash: 'hash-xyz',
        createdAt: new Date(),
        lastSeenAt: new Date(),
        revokedAt: null,
        expiresAt: new Date(),
      };

      const session = SessionFactory.reconstitute(params);

      expect(session.userAgent).toBeNull();
      expect(session.ipAddress).toBeNull();
    });
  });
});
