import { DataSource } from "typeorm";
import { PaymentMethodEntity } from "../../adapters/out/persistence/typeorm/entities/payment-method.entity";
import {
  PAYMENT_METHOD_DEFINITIONS,
  PAYMENT_METHOD_CODES,
} from "../../domain/value-objects/payment-method-catalog";

const PAYMENT_METHODS = PAYMENT_METHOD_CODES.map((code) => PAYMENT_METHOD_DEFINITIONS[code]);

export const seedPaymentMethods = async (dataSource: DataSource): Promise<void> => {
  const repo = dataSource.getRepository(PaymentMethodEntity);

  for (const definition of PAYMENT_METHODS) {
    const existing = await repo.findOne({ where: { code: definition.code } });
    if (existing) {
      await repo.update(
        { id: existing.id },
        {
          name: definition.defaultName,
          category: definition.category,
          requiresVoucher: definition.requiresVoucher,
          requiresSourceAccount: definition.requiresSourceAccount,
          requiresDestination: definition.requiresDestination,
          requiresOperationReference: definition.requiresOperationReference,
          isSystem: true,
        },
      );
      console.log(`Metodo de pago ${definition.code} ya existe, actualizando catalogo...`);
      continue;
    }

    await repo.save(
      repo.create({
        name: definition.defaultName,
        code: definition.code,
        category: definition.category,
        isActive: true,
        requiresVoucher: definition.requiresVoucher,
        requiresSourceAccount: definition.requiresSourceAccount,
        requiresDestination: definition.requiresDestination,
        requiresOperationReference: definition.requiresOperationReference,
        isSystem: true,
      }),
    );

    console.log(`Metodo de pago creado: ${definition.code}`);
  }
};
