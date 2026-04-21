import { DataSource } from "typeorm";

import { CompanyEntity } from "../../adapters/out/persistence/typeorm/entities/company.entity";

const DEFAULT_COMPANY = {
  name: "Eunoia",
  ruc: "20123456789",
  production: true,
  isActive: true,
};

export const seedCompany = async (dataSource: DataSource): Promise<void> => {
  const repo = dataSource.getRepository(CompanyEntity);

  const existingActiveCompany = await repo.findOne({
    where: { isActive: true },
    order: { createdAt: "ASC" },
  });

  if (existingActiveCompany) {
    console.log(`Empresa ${existingActiveCompany.name} ya existe, omitiendo...`);
    return;
  }

  const existingByRuc = await repo.findOne({
    where: { ruc: DEFAULT_COMPANY.ruc },
  });

  if (existingByRuc) {
    await repo.save(
      repo.merge(existingByRuc, {
        ...DEFAULT_COMPANY,
      }),
    );

    console.log(`Empresa actualizada: ${DEFAULT_COMPANY.name}`);
    return;
  }

  await repo.save(
    repo.create({
      ...DEFAULT_COMPANY,
    }),
  );

  console.log(`Empresa creada: ${DEFAULT_COMPANY.name}`);
};
