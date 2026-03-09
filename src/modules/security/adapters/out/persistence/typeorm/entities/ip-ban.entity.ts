import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('security_ip_bans')
@Index('idx_security_ip_bans_ip_unique', ['ip'], { unique: true })
export class IpBan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  ip: string;

  @Column({ name: 'ban_level', type: 'int', default: 0 })
  banLevel: number;

  @Column({ name: 'banned_until', type: 'timestamptz', nullable: true })
  bannedUntil: Date | null;

  @Column({ name: 'manual_permanent_ban', type: 'boolean', default: false })
  manualPermanentBan: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 120, nullable: true })
  createdBy: string | null;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 120, nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'last_reason', type: 'varchar', length: 120, nullable: true })
  lastReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

