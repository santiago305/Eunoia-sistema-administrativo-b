import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('message_label_assignments')
export class MessageLabelAssignmentEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'label_id', type: 'uuid' })
  labelId: string;

  @Column({ name: 'message_user_state_id', type: 'uuid' })
  messageUserStateId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
