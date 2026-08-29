import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';

@Entity('sale_order_adviser_import_aliases')
@Index(
  'ux_sale_order_adviser_import_aliases_normalized_name',
  ['normalizedName'],
  { unique: true },
)
@Index('ix_sale_order_adviser_import_aliases_adviser', ['adviserUserId'])
export class SaleOrderAdviserImportAliasEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'adviser_import_alias_id' })
  id: string;

  @Column({ name: 'external_name', type: 'varchar', length: 160 })
  externalName: string;

  @Column({ name: 'normalized_name', type: 'varchar', length: 160 })
  normalizedName: string;

  @Column({ name: 'adviser_user_id', type: 'uuid' })
  adviserUserId: string;

  @ManyToOne(() => User, { nullable: false, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'adviser_user_id' })
  adviser: User;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
