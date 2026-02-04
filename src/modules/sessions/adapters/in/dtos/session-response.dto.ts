export class SessionResponseDto {
  id: string;
  userId: string;
  isCurrent: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  ip: string | null;
  userAgent: string | null;
  deviceName: string | null;
}
