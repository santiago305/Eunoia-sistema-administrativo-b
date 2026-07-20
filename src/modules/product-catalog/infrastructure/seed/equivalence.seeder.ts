import { DataSource } from "typeorm";
export const seedProductCatalogEquivalences = async (dataSource: DataSource): Promise<void> => {
  // Las equivalencias son específicas por producto. No existen conversiones base
  // seguras que se puedan sembrar sin conocer sus presentaciones comerciales.
  // Se conservan como configuración manual al crear o editar cada producto.
  void dataSource;
};
