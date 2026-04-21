import { DataSource } from 'typeorm';
import { envs } from './src/infrastructure/config/envs';
import { Role } from './src/modules/roles/adapters/out/persistence/typeorm/entities/role.entity';
import { User } from './src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { Session } from './src/modules/sessions/adapters/out/persistence/typeorm/entities/session.entity';
import { ProductEntity } from './src/shared/infrastructure/typeorm/entities/product.entity';
import { WarehouseEntity } from './src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse';
import { WarehouseLocationEntity } from './src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse-location';
import { SupplierEntity } from './src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity';
import { SupplierSkuEntity } from './src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier-sku.entity';
import { PaymentMethodEntity } from './src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity';
import { SupplierMethodEntity } from './src/modules/payment-methods/adapters/out/persistence/typeorm/entities/supplier-method.entity';
import { CompanyMethodEntity } from './src/modules/payment-methods/adapters/out/persistence/typeorm/entities/company-method.entity';
import { PurchaseOrderEntity } from './src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from './src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order-item.entity';
import { PaymentDocumentEntity } from './src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity';
import { CreditQuotaEntity } from './src/modules/payments/adapters/out/persistence/typeorm/entities/credit-quota.entity';
import { ProductionOrderEntity } from './src/modules/production/adapters/out/persistence/typeorm/entities/production_order.entity';
import { ProductionOrderItemEntity } from './src/modules/production/adapters/out/persistence/typeorm/entities/production_order_item.entity';
import { SecurityReasonCatalog } from './src/modules/security/adapters/out/persistence/typeorm/entities/security-reason-catalog.entity';
import { IpBan } from './src/modules/security/adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { IpViolation } from './src/modules/security/adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { CompanyEntity } from './src/modules/companies/adapters/out/persistence/typeorm/entities/company.entity';
import { ProductCatalogAttributeEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/attribute.entity';
import { ProductCatalogPublicationEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/catalog-publication.entity';
import { ProductCatalogInventoryEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/inventory.entity';
import { ProductCatalogInventoryDocumentItemEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/inventory-document-item.entity';
import { ProductCatalogInventoryDocumentEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/inventory-document.entity';
import { ProductCatalogInventoryLedgerEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/inventory-ledger.entity';
import { ProductCatalogProductEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/product.entity';
import { ProductCatalogRecipeItemEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/recipe-item.entity';
import { ProductCatalogRecipeEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/recipe.entity';
import { ProductCatalogSkuAttributeValueEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku-attribute-value.entity';
import { ProductCatalogSkuEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity';
import { ProductCatalogStockItemEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/stock-item.entity';
import { ProductCatalogDocumentSerieEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/document-serie.entity';
import { ProductCatalogUnitEntity } from './src/modules/product-catalog/adapters/out/persistence/typeorm/entities/unit.entity';
import { UbigeoDepartmentEntity } from './src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-department.entity';
import { UbigeoProvinceEntity } from './src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-province.entity';
import { UbigeoDistrictEntity } from './src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-district.entity';

const entities = [
  Role,
  User,
  Session,
  ProductEntity,
  WarehouseEntity,
  WarehouseLocationEntity,
  SupplierEntity,
  SupplierSkuEntity,
  PaymentMethodEntity,
  SupplierMethodEntity,
  CompanyMethodEntity,
  PurchaseOrderEntity,
  PurchaseOrderItemEntity,
  PaymentDocumentEntity,
  CreditQuotaEntity,
  ProductionOrderEntity,
  ProductionOrderItemEntity,
  SecurityReasonCatalog,
  IpBan,
  IpViolation,
  CompanyEntity,
  ProductCatalogProductEntity,
  ProductCatalogSkuEntity,
  ProductCatalogAttributeEntity,
  ProductCatalogSkuAttributeValueEntity,
  ProductCatalogDocumentSerieEntity,
  ProductCatalogRecipeEntity,
  ProductCatalogRecipeItemEntity,
  ProductCatalogPublicationEntity,
  ProductCatalogStockItemEntity,
  ProductCatalogInventoryEntity,
  ProductCatalogInventoryDocumentEntity,
  ProductCatalogInventoryDocumentItemEntity,
  ProductCatalogInventoryLedgerEntity,
  ProductCatalogUnitEntity,
  UbigeoDepartmentEntity,
  UbigeoProvinceEntity,
  UbigeoDistrictEntity,
];

const dataSource = new DataSource({
  type: 'postgres',
  host: envs.db.host,
  port: envs.db.port,
  username: envs.db.username,
  password: envs.db.password,
  database: envs.db.name,
  dropSchema: true,
  synchronize: true,
  logging: false,
  entities,
});

dataSource
  .initialize()
  .then(async () => {
    console.log('[Clear] Esquema eliminado y recreado correctamente.');
    await dataSource.destroy();
    console.log('[Clear] Base de datos lista para seed.');
  })
  .catch((err) => {
    console.error('[Clear] Error al inicializar la conexion:', err);
  });
