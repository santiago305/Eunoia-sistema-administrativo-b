import { DataSource } from 'typeorm';
import { envs } from './src/infrastructure/config/envs';
import { Role } from './src/modules/roles/adapters/out/persistence/typeorm/entities/role.entity';
import { User } from './src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { Session } from './src/modules/sessions/adapters/out/persistence/typeorm/entities/session.entity';
import { UnitEntity } from './src/modules/catalog/adapters/out/persistence/typeorm/entities/unit.entity';
import { ProductEntity } from './src/modules/catalog/adapters/out/persistence/typeorm/entities/product.entity';
import { ProductVariantEntity } from './src/modules/catalog/adapters/out/persistence/typeorm/entities/product-variant.entity';
import { ProductEquivalenceEntity } from './src/modules/catalog/adapters/out/persistence/typeorm/entities/product-equivalence.entity';
import { ProductRecipeEntity } from './src/modules/catalog/adapters/out/persistence/typeorm/entities/product-recipe.entity';
import { SkuCounterEntity } from './src/modules/catalog/adapters/out/persistence/typeorm/entities/sku-counter.entity';
import { WarehouseEntity } from './src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse';
import { WarehouseLocationEntity } from './src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse-location';
import { SupplierEntity } from './src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity';
import { SupplierVariantEntity } from './src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier-variant.entity';
import { PaymentMethodEntity } from './src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity';
import { SupplierMethodEntity } from './src/modules/payment-methods/adapters/out/persistence/typeorm/entities/supplier-method.entity';
import { CompanyMethodEntity } from './src/modules/payment-methods/adapters/out/persistence/typeorm/entities/company-method.entity';
import { PurchaseOrderEntity } from './src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from './src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order-item.entity';
import { PaymentDocumentEntity } from './src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity';
import { CreditQuotaEntity } from './src/modules/payments/adapters/out/persistence/typeorm/entities/credit-quota.entity';
import { StockItemEntity } from './src/modules/inventory/adapters/out/typeorm/entities/stock-item.entity';
import { InventoryEntity } from './src/modules/inventory/adapters/out/typeorm/entities/inventory.entity';
import { InventoryLedgerEntity } from './src/modules/inventory/adapters/out/typeorm/entities/inventory_ledger.entity';
import { InventoryDocumentEntity } from './src/modules/inventory/adapters/out/typeorm/entities/inventory_document.entity';
import { InventoryDocumentItemEntity } from './src/modules/inventory/adapters/out/typeorm/entities/inventory_document_item.entity';
import { DocumentSerie } from './src/modules/inventory/adapters/out/typeorm/entities/document_serie.entity';
import { ProductionOrderEntity } from './src/modules/production/adapters/out/persistence/typeorm/entities/production_order.entity';
import { ProductionOrderItemEntity } from './src/modules/production/adapters/out/persistence/typeorm/entities/production_order_item.entity';
import { SecurityReasonCatalog } from './src/modules/security/adapters/out/persistence/typeorm/entities/security-reason-catalog.entity';
import { IpBan } from './src/modules/security/adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { IpViolation } from './src/modules/security/adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { CompanyEntity } from './src/modules/companies/adapters/out/persistence/typeorm/entities/company.entity';
import { seedRoles } from './src/modules/roles/infrastructure/seed/role.seeder';
import { seedUser } from './src/modules/users/infrastructure/seed/user.seeder';
import { seedSecurityReasonCatalog } from './src/modules/security/infrastructure/seed/security-reason-catalog.seeder';
import { seedSecurityIpActivity } from './src/modules/security/infrastructure/seed/security-ip-activity.seeder';
import { seedUnits } from './src/modules/catalog/infrastructure/seed/unit.seeder';
import { seedWarehouses } from './src/modules/warehouses/infrastructure/seed/warehouse.seeder';
import { seedDocumentSeries } from './src/modules/inventory/infrastructure/seed/document_serie.seeder';
import { seedPaymentMethods } from './src/modules/payment-methods/infrastructure/seed/payment-method.seeder';
import { seedSuppliers } from './src/modules/suppliers/infrastructure/seed/supplier.seeder';
import { seedProducts } from './src/modules/catalog/infrastructure/seed/product.seeder';
import { seedProductEquivalences } from './src/modules/catalog/infrastructure/seed/product-equivalence.seeder';
import { seedProductRecipes } from './src/modules/catalog/infrastructure/seed/product-recipe.seeder';
import { seedPurchaseOrders } from './src/modules/purchases/infrastructure/seed/purchase-order.seeder';

const entities = [
  Role,
  User,
  Session,
  UnitEntity,
  ProductEntity,
  ProductVariantEntity,
  ProductEquivalenceEntity,
  ProductRecipeEntity,
  SkuCounterEntity,
  WarehouseEntity,
  WarehouseLocationEntity,
  SupplierEntity,
  SupplierVariantEntity,
  PaymentMethodEntity,
  SupplierMethodEntity,
  CompanyMethodEntity,
  PurchaseOrderEntity,
  PurchaseOrderItemEntity,
  PaymentDocumentEntity,
  CreditQuotaEntity,
  StockItemEntity,
  InventoryEntity,
  InventoryLedgerEntity,
  InventoryDocumentEntity,
  InventoryDocumentItemEntity,
  DocumentSerie,
  ProductionOrderEntity,
  ProductionOrderItemEntity,
  SecurityReasonCatalog,
  IpBan,
  IpViolation,
  CompanyEntity,
];

const dataSource = new DataSource({
  type: 'postgres',
  host: envs.db.host,
  port: envs.db.port,
  username: envs.db.username,
  password: envs.db.password,
  database: envs.db.name,
  synchronize: true,
  logging: false,
  entities,
});

dataSource
  .initialize()
  .then(async () => {
    console.log('Iniciando seed...');

    await seedRoles(dataSource);
    await seedUser(dataSource);
    await seedSecurityReasonCatalog(dataSource);
    await seedSecurityIpActivity(dataSource);
    await seedUnits(dataSource);

    const warehouses = await seedWarehouses(dataSource);
    for (const wh of warehouses) {
      await seedDocumentSeries(dataSource, wh.id);
    }

    await seedPaymentMethods(dataSource);
    // await seedSuppliers(dataSource, 10000);
    // await seedProducts(dataSource, { finishedCount: 4500, rawCount: 5500, variantsPerProduct: 2 });
    // await seedProductEquivalences(dataSource, { minPerProduct: 1, maxPerProduct: 4 });
    // await seedProductRecipes(dataSource, { minPerFinished: 1, maxPerFinished: 3 });
    // await seedPurchaseOrders(dataSource, 10000);

    await dataSource.destroy();
    console.log('Seeding completo!');
  })
  .catch((err) => {
    console.error('Error al hacer seed:', err);
  });
