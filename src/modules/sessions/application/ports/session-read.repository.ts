export const SESSION_READ_REPOSITORY = Symbol('SESSION_READ_REPOSITORY');

export interface SessionReadRepository {
  listUserSessions(
    userId: string,
    params?: {
      includeRevoked?: boolean;
      includeExpired?: boolean;
    }
  ): Promise<
    Array<{
      id: string;
      userId: string;
      deviceId: string;
      deviceName: string | null;
      userAgent: string | null;
      ipAddress: string | null;
      createdAt: Date;
      lastSeenAt: Date;
      revokedAt: Date | null;
      expiresAt: Date;
    }>
  >;

  findById(id: string): Promise<{
    id: string;
    userId: string;
    deviceId: string;
    deviceName: string | null;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: Date;
    lastSeenAt: Date;
    revokedAt: Date | null;
    expiresAt: Date;
  } | null>;

  findAuthById(id: string): Promise<{
    id: string;
    userId: string;
    refreshTokenHash: string;
    revokedAt: Date | null;
    expiresAt: Date;
  } | null>;
}
