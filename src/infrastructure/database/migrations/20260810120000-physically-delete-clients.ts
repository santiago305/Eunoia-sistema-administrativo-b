import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhysicallyDeleteClients20260810120000
  implements MigrationInterface
{
  name = 'PhysicallyDeleteClients20260810120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM clients`);
  }

  public async down(): Promise<void> {
    // La eliminacion fisica de los clientes no se puede revertir.
  }
}
