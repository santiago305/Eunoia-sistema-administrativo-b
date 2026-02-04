export class Session {
  constructor(
    public readonly id: string,
    public userId: string,
    public refreshTokenHash: string,
    public createdAt: Date,
    public lastUsedAt: Date | null,
    public expiresAt: Date,
    public revokedAt: Date | null,
    public ip: string | null,
    public userAgent: string | null,
    public deviceName: string | null,
  ) {}
}
