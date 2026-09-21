import { MigrationInterface, QueryRunner } from "typeorm";

export class RetireUnusedBankAccounts20260921170000 implements MigrationInterface {
  name = "RetireUnusedBankAccounts20260921170000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(`SELECT COUNT(*)::int AS count FROM bank_accounts`);
    const count = Number(rows?.[0]?.count ?? 0);
    if (count > 0) {
      throw new Error(
        "No se puede retirar bank_accounts: existen registros. Requiere conciliacion manual antes de eliminar la tabla.",
      );
    }
    await queryRunner.query(`DROP TABLE IF EXISTS bank_accounts`);
  }

  public async down(): Promise<void> {
    throw new Error(
      "La retirada de bank_accounts es destructiva y no tiene rollback automatico. Restaurar desde el respaldo previo a Fase 9.",
    );
  }
}
