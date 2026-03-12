import { DataSource } from "typeorm";
import { PaymentMethodEntity } from "../../adapters/out/persistence/typeorm/entities/payment-method.entity";

const PAYMENT_METHODS = ["YAPE", "PLIN", "BCP", "BBVA", "EFECTIVO", "TARJETA"];

export const seedPaymentMethods = async (dataSource: DataSource): Promise<void> => {
  const repo = dataSource.getRepository(PaymentMethodEntity);

  for (const name of PAYMENT_METHODS) {
    const existing = await repo.findOne({ where: { name } });
    if (existing) {
      console.log(`Metodo de pago ${name} ya existe, omitiendo...`);
      continue;
    }

    await repo.save(
      repo.create({
        name,
        isActive: true,
      }),
    );

    console.log(`Metodo de pago creado: ${name}`);
  }
};
