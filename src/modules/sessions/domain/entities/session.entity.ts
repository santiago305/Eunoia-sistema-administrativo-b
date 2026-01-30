
export class Session {
    constructor(
        public readonly id: string,
        public userId: string,
        public deviceId: string,
        public deviceName: string | null,
        public userAgent: string | null,
        public ipAddress: string | null,
        public refreshTokenHash: string,
        public createdAt: Date,
        public lastSeenAt: Date,
        public revokedAt: Date | null,
        public expiresAt: Date,
    ) {}
}