import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { SourceEntity } from "./source.entity";

@Entity("source_recognition_codes")
@Index("ux_source_recognition_codes_code", ["code"], { unique: true })
@Index("ix_source_recognition_codes_source_id", ["sourceId"])
export class SourceRecognitionCodeEntity {
  @PrimaryGeneratedColumn("uuid", { name: "recognition_code_id" })
  id: string;

  @Column({ name: "source_id", type: "uuid" })
  sourceId: string;

  @ManyToOne(() => SourceEntity, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "source_id" })
  source: SourceEntity;

  @Column({ type: "varchar", length: 80 })
  code: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "is_deleted", type: "boolean", default: false })
  isDeleted: boolean;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy: string | null;

  @Column({ name: "updated_by", type: "uuid", nullable: true })
  updatedBy: string | null;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
