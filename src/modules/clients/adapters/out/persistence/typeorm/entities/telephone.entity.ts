import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ClientEntity } from "./client.entity";

@Index("idx_telephones_client_id", ["clientId"])
@Index("ux_telephones_client_main", ["clientId"], {
  unique: true,
  where: '"is_main" = true',
})
@Entity("telephones")
export class TelephoneEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "client_id", type: "uuid" })
  clientId: string;

  @ManyToOne(() => ClientEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "client_id" })
  client: ClientEntity;

  @Column({ type: "varchar", length: 60 })
  number: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "is_main", type: "boolean", default: false })
  isMain: boolean;
}

