import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { migrationDataSource } from "../src/infrastructure/database/typeorm.config";

type ReceiverMapping = {
  salePaymentId: string;
  companyPaymentAccountId: string;
  paymentMethodId: string;
};

type ReconciliationRow = {
  sale_payment_id: string;
  sale_order_id: string;
  currency: string;
  current_receiver_id: string | null;
  current_payment_method_id: string | null;
  target_receiver_id: string;
  target_name: string;
  target_receiver_type: string;
  target_masked_label: string | null;
  target_payment_method_id: string;
  target_payment_method: string;
  target_payment_method_code: string;
};

const readArgument = (name: string): string | undefined => {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex >= 0) return process.argv[exactIndex + 1];
  return process.argv.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
};

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const parseMappings = async (fileName: string): Promise<ReceiverMapping[]> => {
  const raw = JSON.parse(await readFile(resolve(process.cwd(), fileName), "utf8")) as unknown;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("El archivo debe contener un arreglo JSON no vacío.");
  }

  const mappings = raw.map((item, index) => {
    const value = item as Partial<ReceiverMapping>;
    if (!isUuid(value.salePaymentId) || !isUuid(value.companyPaymentAccountId) || !isUuid(value.paymentMethodId)) {
      throw new Error(`La fila ${index + 1} no contiene UUID válidos.`);
    }
    return {
      salePaymentId: value.salePaymentId,
      companyPaymentAccountId: value.companyPaymentAccountId,
      paymentMethodId: value.paymentMethodId,
    };
  });

  const uniqueIds = new Set(mappings.map((mapping) => mapping.salePaymentId));
  if (uniqueIds.size !== mappings.length) {
    throw new Error("El archivo contiene salePaymentId duplicados.");
  }

  return mappings;
};

async function main(): Promise<void> {
  const fileName = readArgument("--file");
  const apply = process.argv.includes("--apply");
  if (!fileName) {
    throw new Error(
      "Uso: pnpm run reconcile:sale-payments -- --file ./ruta/mapeo.json [--apply]",
    );
  }

  const mappings = await parseMappings(fileName);
  await migrationDataSource.initialize();
  const runner = migrationDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();

  try {
    const rows = await runner.query(
      `
        SELECT
          sp.id AS sale_payment_id,
          sp.sale_order_id,
          sp.currency::text AS currency,
          sp.company_payment_account_id AS current_receiver_id,
          sp.payment_method_id AS current_payment_method_id,
          requested.company_payment_account_id AS target_receiver_id,
          requested.payment_method_id AS target_payment_method_id,
          cpa.name AS target_name,
          cpa.type AS target_receiver_type,
          cpa.masked_label AS target_masked_label,
          pm.name AS target_payment_method,
          pm.code AS target_payment_method_code,
          pm.is_active AS target_payment_method_is_active,
          sp.status,
          cpa.is_active,
          cpa.usage,
          cpa.currency::text AS target_currency
        FROM jsonb_to_recordset($1::jsonb) AS requested(
          sale_payment_id uuid,
          company_payment_account_id uuid,
          payment_method_id uuid
        )
        INNER JOIN sale_payments sp ON sp.id = requested.sale_payment_id
        LEFT JOIN company_payment_accounts cpa
          ON cpa.company_payment_account_id = requested.company_payment_account_id
        LEFT JOIN payment_methods pm ON pm.method_id = requested.payment_method_id
        ORDER BY requested.sale_payment_id
        FOR UPDATE OF sp
      `,
      [
        JSON.stringify(
          mappings.map((mapping) => ({
            sale_payment_id: mapping.salePaymentId,
            company_payment_account_id: mapping.companyPaymentAccountId,
            payment_method_id: mapping.paymentMethodId,
          })),
        ),
      ],
    );

    const errors: string[] = [];
    for (const row of rows) {
      if (!row.sale_payment_id) {
        errors.push(`No existe el cobro solicitado para el destino ${row.target_receiver_id}.`);
        continue;
      }
      if (row.status !== "POSTED") {
        errors.push(`El cobro ${row.sale_payment_id} no está contabilizado (estado ${row.status}).`);
      }
      if (!row.target_name) {
        errors.push(`No existe la cuenta receptora ${row.target_receiver_id}.`);
        continue;
      }
      if (!row.is_active) errors.push(`La cuenta ${row.target_receiver_id} está inactiva.`);
      if (row.usage !== "INFLOW" && row.usage !== "BOTH") {
        errors.push(`La cuenta ${row.target_receiver_id} no permite ingresos.`);
      }
      if (row.target_currency !== row.currency) {
        errors.push(
          `La moneda de la cuenta ${row.target_receiver_id} (${row.target_currency}) no coincide con el cobro ${row.sale_payment_id} (${row.currency}).`,
        );
      }
      if (!row.target_payment_method) {
        errors.push(`No existe el método ${row.target_payment_method_id}.`);
        continue;
      }
      if (!row.target_payment_method_is_active) {
        errors.push(`El método ${row.target_payment_method_id} está inactivo.`);
      }
      const compatibleTypes: Record<string, string[]> = {
        CASH: ["CASH"],
        BANK_TRANSFER: ["BANK_ACCOUNT"],
        BANK_DEPOSIT: ["BANK_ACCOUNT", "CASH"],
        CARD: ["CREDIT_CARD"],
        DIGITAL_WALLET: ["DIGITAL_WALLET"],
        CHECK: ["BANK_ACCOUNT"],
      };
      const allowedTypes = compatibleTypes[row.target_payment_method_code];
      if (allowedTypes && !allowedTypes.includes(row.target_receiver_type)) {
        errors.push(
          `La cuenta ${row.target_receiver_id} (${row.target_receiver_type}) no es compatible con ${row.target_payment_method_code}.`,
        );
      }
    }

    if (rows.length !== mappings.length) {
      errors.push(`Se solicitaron ${mappings.length} cobros, pero la base devolvió ${rows.length}.`);
    }
    if (errors.length > 0) {
      throw new Error(`No se puede conciliar:\n- ${errors.join("\n- ")}`);
    }

    const preview: ReconciliationRow[] = rows.map((row) => ({
      sale_payment_id: row.sale_payment_id,
      sale_order_id: row.sale_order_id,
      currency: row.currency,
      current_receiver_id: row.current_receiver_id,
      current_payment_method_id: row.current_payment_method_id,
      target_receiver_id: row.target_receiver_id,
      target_name: row.target_name,
      target_receiver_type: row.target_receiver_type,
      target_masked_label: row.target_masked_label,
      target_payment_method_id: row.target_payment_method_id,
      target_payment_method: row.target_payment_method,
      target_payment_method_code: row.target_payment_method_code,
    }));
    console.table(preview);

    if (!apply) {
      await runner.rollbackTransaction();
      console.log(`Simulación correcta: ${rows.length} cobros validados; no se modificó la base.`);
      console.log("Repita el comando con --apply después de revisar la tabla.");
      return;
    }

    for (const mapping of mappings) {
      await runner.query(
        `
          UPDATE sale_payments
          SET company_payment_account_id = $2,
              payment_method_id = $3
          WHERE id = $1
        `,
        [mapping.salePaymentId, mapping.companyPaymentAccountId, mapping.paymentMethodId],
      );
    }

    await runner.commitTransaction();
    console.log(`Conciliación aplicada: ${rows.length} cobros actualizados.`);
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
    if (migrationDataSource.isInitialized) await migrationDataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
