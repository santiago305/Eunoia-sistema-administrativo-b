import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'device_id' })
  deviceId: string;

  @Column({ name: 'device_name', type: 'varchar', length: 200, nullable: true })
  deviceName?: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent?: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 500 })
  refreshTokenHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamp' })
  lastSeenAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;
}
