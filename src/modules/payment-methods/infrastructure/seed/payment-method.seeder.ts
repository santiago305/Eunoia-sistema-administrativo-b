import { DataSource } from "typeorm";
import { PaymentMethodEntity } from "../../adapters/out/persistence/typeorm/entities/payment-method.entity";

type SeedPaymentMethod = {
  name: string;
  number?: string | null;
};

const PAYMENT_METHODS: SeedPaymentMethod[] = [
  { name: "YAPE", number: "999111222" },
  { name: "PLIN", number: "988333444" },
  { name: "BCP", number: "0012345678901234" },
  { name: "BBVA", number: "0023456789012345" },
  { name: "EFECTIVO", number: null },
  { name: "TARJETA", number: "4111111111111111" },
];

export const seedPaymentMethods = async (dataSource: DataSource): Promise<void> => {
  const repo = dataSource.getRepository(PaymentMethodEntity);

  for (const method of PAYMENT_METHODS) {
    const existing = await repo.findOne({ where: { name: method.name } });
    if (existing) {
      console.log(`Metodo de pago ${method.name} ya existe, omitiendo...`);
      continue;
    }

    await repo.save(
      repo.create({
        name: method.name,
        number: method.number ?? null,
        isActive: true,
      }),
    );

    console.log(`Metodo de pago creado: ${method.name}`);
  }
};
