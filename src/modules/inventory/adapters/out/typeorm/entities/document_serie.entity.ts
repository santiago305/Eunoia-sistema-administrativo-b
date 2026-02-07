import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';
import { DocType } from 'src/modules/inventory/domain/value-objects/doc-type';

@Entity('document_series')
@Index(['docType'], { unique: true })
export class DocumentSerie {
  @PrimaryGeneratedColumn('uuid', { name: 'serie_id' })
  id: string;

  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 80, name: 'doc_type' })
  docType: DocType;

  @Column({ type: 'uuid', name: 'warehouse_id' })
  warehouseId: string;

  @Column({ type: 'integer', name: 'next_number', default: 1 })
  nextNumber: number;

  // Cantidad de ceros a la izquierda
  @Column({ type: 'smallint', default: 6 })
  padding: number;

  // Separador entre code y número
  @Column({ type: 'varchar', length: 5, default: '-' })
  separator: string;

  // Serie activa o no
  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'now()' })
  createdAt: Date;
}
