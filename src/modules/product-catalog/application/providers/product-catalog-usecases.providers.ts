import { Provider } from "@nestjs/common";
import { CreateProductCatalogProduct } from "../usecases/create-product.usecase";
import { UpdateProductCatalogProduct } from "../usecases/update-product.usecase";
import { ListProductCatalogProducts } from "../usecases/list-products.usecase";
import { GetProductCatalogProduct } from "../usecases/get-product.usecase";
import { CreateProductCatalogSku } from "../usecases/create-sku.usecase";
import { UpdateProductCatalogSku } from "../usecases/update-sku.usecase";
import { GetProductCatalogSku } from "../usecases/get-sku.usecase";
import { ListProductCatalogSkus } from "../usecases/list-skus.usecase";
import { CreateProductCatalogRecipe } from "../usecases/create-recipe.usecase";
import { GetProductCatalogRecipe } from "../usecases/get-recipe.usecase";
import { CreateProductCatalogPublication } from "../usecases/create-publication.usecase";
import { UpdateProductCatalogPublication } from "../usecases/update-publication.usecase";
import { ListProductCatalogChannelSkus } from "../usecases/list-channel-skus.usecase";
import { CreateProductCatalogStockItem } from "../usecases/create-stock-item.usecase";
import { GetProductCatalogStockItem } from "../usecases/get-stock-item.usecase";
import { GetProductCatalogSkuStockItem } from "../usecases/get-sku-stock-item.usecase";
import { UpsertProductCatalogInventoryBalance } from "../usecases/upsert-inventory-balance.usecase";
import { ListProductCatalogInventoryBySku } from "../usecases/list-inventory-by-sku.usecase";
import { RegisterProductCatalogInventoryMovement } from "../usecases/register-inventory-movement.usecase";
import { ListProductCatalogInventoryLedger } from "../usecases/list-inventory-ledger.usecase";
import { ReserveProductCatalogMaterials } from "../usecases/reserve-materials.usecase";

export const productCatalogUsecasesProviders: Provider[] = [
  CreateProductCatalogProduct,
  UpdateProductCatalogProduct,
  ListProductCatalogProducts,
  GetProductCatalogProduct,
  CreateProductCatalogSku,
  UpdateProductCatalogSku,
  GetProductCatalogSku,
  ListProductCatalogSkus,
  CreateProductCatalogRecipe,
  GetProductCatalogRecipe,
  CreateProductCatalogPublication,
  UpdateProductCatalogPublication,
  ListProductCatalogChannelSkus,
  CreateProductCatalogStockItem,
  GetProductCatalogStockItem,
  GetProductCatalogSkuStockItem,
  UpsertProductCatalogInventoryBalance,
  ListProductCatalogInventoryBySku,
  RegisterProductCatalogInventoryMovement,
  ListProductCatalogInventoryLedger,
  ReserveProductCatalogMaterials,
];
