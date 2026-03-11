import { DataSource } from 'typeorm';
import { envs } from './src/infrastructure/config/envs';
import { Role } from './src/modules/roles/adapters/out/persistence/typeorm/entities/role.entity';
import { User } from './src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
// import { DocumentSerie } from 'src/modules/inventory/adapters/out/typeorm/entities/document_serie.entity'
import { seedRoles } from './src/modules/roles/infrastructure/seed/role.seeder';
import { seedUser } from './src/modules/users/infrastructure/seed/user.seeder';
// import { seedDocumentSeries } from 'src/modules/inventory/infrastructure/seed/document_serie.seeder'
// import { seedUnits } from 'src/modules/catalog/infrastructure/seed/unit.seeder'
// import { UnitEntity } from 'src/modules/catalog/adapters/out/persistence/typeorm/entities/unit.entity';
// import { WarehouseEntity } from 'src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse';
// import { WarehouseLocationEntity } from 'src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse-location';
// import { seedWarehouses } from 'src/modules/warehouses/infrastructure/seed/warehouse.seeder';
// import { SupplierEntity } from 'src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity';
// import { seedSuppliers } from 'src/modules/suppliers/infrastructure/seed/supplier.seeder';
// import { ProductEntity } from 'src/modules/catalog/adapters/out/persistence/typeorm/entities/product.entity';
// import { ProductVariantEntity } from 'src/modules/catalog/adapters/out/persistence/typeorm/entities/product-variant.entity';
// import { ProductEquivalenceEntity } from 'src/modules/catalog/adapters/out/persistence/typeorm/entities/product-equivalence.entity';
// import { seedProducts } from 'src/modules/catalog/infrastructure/seed/product.seeder';
// import { seedProductEquivalences } from 'src/modules/catalog/infrastructure/seed/product-equivalence.seeder';
// import { PurchaseOrderEntity } from 'src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity';
// import { PurchaseOrderItemEntity } from 'src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order-item.entity';
// import { PaymentDocumentEntity } from 'src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity';
// import { PaymentPurchaseEntity } from 'src/modules/payments/adapters/out/persistence/typeorm/entities/payment-purchase.entity';
// import { CreditQuotaEntity } from 'src/modules/payments/adapters/out/persistence/typeorm/entities/credit-quota.entity';
// import { CreditQuotaPurchaseEntity } from 'src/modules/payments/adapters/out/persistence/typeorm/entities/credit-quota-purchase.entity';
// import { StockItemEntity } from 'src/modules/inventory/adapters/out/typeorm/entities/stock-item/stock-item.entity';
// import { seedPurchaseOrders } from 'src/modules/purchases/infrastructure/seed/purchase-order.seeder';
/**
 * Script de ejecución que inicializa la base de datos con roles predefinidos.
 *
 * Este script crea una conexión temporal a la base de datos utilizando TypeORM y
 * ejecuta la función `seedRoles` para insertar roles definidos en el sistema.
 * Luego, cierra la conexión.
 *
 * @remarks
 * - Se recomienda ejecutar este script solo en entornos de desarrollo o staging.
 * - Asegúrate de que la base de datos ya esté sincronizada (no usa `synchronize: true`).
 *
 * @example
 * ```bash
 * ts-node seed.ts
 * # o si usas un package script:
 * npm run seed
 * ```
 */
const dataSource = new DataSource({
  type: 'postgres',
  host: envs.db.host,
  port: envs.db.port,
  username: envs.db.username,
  password: envs.db.password,
  database: envs.db.name,
  synchronize: true, // ya sincronizó antes
  logging: false,
  entities: [
    Role,
    User,
    // DocumentSerie,
    // UnitEntity,
    // WarehouseEntity,
    // WarehouseLocationEntity,
    // SupplierEntity,
    // ProductEntity,
    // ProductVariantEntity,
    // ProductEquivalenceEntity,
    // PurchaseOrderEntity,
    // PurchaseOrderItemEntity,
    // PaymentDocumentEntity,
    // PaymentPurchaseEntity,
    // CreditQuotaEntity,
    // CreditQuotaPurchaseEntity,
    // StockItemEntity,
  ], // puedes agregar más entidades si quieres hacer seed de varias tablas
});

dataSource
  .initialize()
  .then(async () => {
    console.log('Iniciando seed...');
    await seedRoles(dataSource); // ejecuta la siembra de roles
    await seedUser(dataSource); // ejecuta la siembra de usuario
    // await seedUnits(dataSource);
    // const warehouses = await seedWarehouses(dataSource);
    // for (const wh of warehouses) {
    //   await seedDocumentSeries(dataSource, wh.id);
    // }
    // await seedSuppliers(dataSource, 10000);
    // await seedProducts(dataSource, { finishedCount: 4500, rawCount: 5500, variantsPerProduct: 2 });
    // await seedProductEquivalences(dataSource, { minPerProduct: 1, maxPerProduct: 4 });
    // await seedPurchaseOrders(dataSource, 10000);
    await dataSource.destroy(); // cierra la conexión con la DB
    console.log('Seeding completo!');
  })
  .catch((err) => {
    console.error('Error al hacer seed:', err);
  });

