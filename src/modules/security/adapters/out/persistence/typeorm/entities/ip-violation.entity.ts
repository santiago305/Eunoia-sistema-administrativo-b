import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('security_ip_violations')
@Index('idx_security_ip_violations_ip_created', ['ip', 'createdAt'])
export class IpViolation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  ip: string;

  @Column({ type: 'varchar', length: 120 })
  reason: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  path: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  method: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ name: 'request_id', type: 'varchar', length: 120, nullable: true })
  requestId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  actor: string | null;

  @Column({ name: 'throttler_name', type: 'varchar', length: 120, nullable: true })
  throttlerName: string | null;

  @Column({ name: 'tracker_type', type: 'varchar', length: 20, nullable: true })
  trackerType: string | null;

  @Column({ name: 'tracker_key_hash', type: 'varchar', length: 64, nullable: true })
  trackerKeyHash: string | null;

  @Column({ name: 'user_id', type: 'varchar', length: 120, nullable: true })
  userId: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 120, nullable: true })
  sessionId: string | null;

  @Column({ name: 'total_hits', type: 'int', nullable: true })
  totalHits: number | null;

  @Column({ name: 'request_limit', type: 'int', nullable: true })
  requestLimit: number | null;

  @Column({ name: 'window_seconds', type: 'int', nullable: true })
  windowSeconds: number | null;

  @Column({ name: 'retry_after_seconds', type: 'int', nullable: true })
  retryAfterSeconds: number | null;

  @Column({ name: 'counted_for_ban', type: 'boolean', default: false })
  countedForBan: boolean;

  @Column({ name: 'ban_level_after', type: 'int', nullable: true })
  banLevelAfter: number | null;

  @Column({ name: 'banned_until_after', type: 'timestamptz', nullable: true })
  bannedUntilAfter: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
