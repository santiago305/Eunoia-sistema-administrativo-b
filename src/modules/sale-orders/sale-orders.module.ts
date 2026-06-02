import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductCatalogModule } from "src/modules/product-catalog/product-catalog.module";
import { PacksModule } from "src/modules/packs/packs.module";
import { MailModule } from "src/modules/mail";
import { SaleOrderEntity } from "./adapters/out/persistence/typeorm/entities/sale-order.entity";
import { SaleOrderItemEntity } from "./adapters/out/persistence/typeorm/entities/sale-order-item.entity";
import { SaleOrderItemComponentEntity } from "./adapters/out/persistence/typeorm/entities/sale-order-item-component.entity";
import { SalePaymentEntity } from "./adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { SourceEntity } from "src/modules/sources/adapters/out/persistence/typeorm/entities/source.entity";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { BankAccountEntity } from "src/modules/bank-accounts/adapters/out/persistence/typeorm/entities/bank-account.entity";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { saleOrdersModuleProviders } from "./composition/container";
import { SaleOrdersController } from "./adapters/in/controllers/sale-orders.controller";
import { ClientsModule } from "../clients/clients.module";
import { SourcesModule } from "../sources/sources.module";
import { UbigeoModule } from "../ubigeo/ubigeo.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaleOrderEntity,
      SaleOrderItemEntity,
      SaleOrderItemComponentEntity,
      SalePaymentEntity,
      ListingSearchRecentEntity,
      ListingSearchMetricEntity,
      ClientEntity,
      WarehouseEntity,
      SourceEntity,
      User,
      BankAccountEntity,
      ProductCatalogSkuEntity,
    ]),
    PacksModule,
    ProductCatalogModule,
    MailModule,
    ClientsModule,
    SourcesModule,
    UbigeoModule,
  ],
  controllers: [SaleOrdersController],
  providers: [...saleOrdersModuleProviders],
})
export class SaleOrdersModule {}
