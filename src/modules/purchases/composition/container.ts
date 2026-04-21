import { Provider } from "@nestjs/common";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { PurchaseOrderItemTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/purchase-order-item.typeorm.repo";
import { PurchaseSearchTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/purchase-search.typeorm.repo";
import { PurchaseOrderTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/purchase-order.typeorm.repo";
import { purchasesUsecasesProviders } from "../application/providers/purchases-usecases.providers";
import { PURCHASE_ORDER_ITEM } from "../domain/ports/purchase-order-item.port.repository";
import { PURCHASE_ORDER } from "../domain/ports/purchase-order.port.repository";
import { PURCHASE_SEARCH } from "../domain/ports/purchase-search.repository";
import { CreateProductCatalogStockItem } from "src/modules/product-catalog/application/usecases/create-stock-item.usecase";

export const purchasesModuleProviders: Provider[] = [
  ...purchasesUsecasesProviders,
  { provide: PURCHASE_ORDER, useClass: PurchaseOrderTypeormRepository },
  { provide: PURCHASE_ORDER_ITEM, useClass: PurchaseOrderItemTypeormRepository },
  { provide: PURCHASE_SEARCH, useClass: PurchaseSearchTypeormRepository },
  { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  CreateProductCatalogStockItem, 

];
