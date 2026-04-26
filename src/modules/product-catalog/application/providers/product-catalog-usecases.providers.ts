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
import { DeleteProductCatalogRecipeItem } from "../usecases/delete-recipe-item.usecase";
import { GetProductCatalogRecipe } from "../usecases/get-recipe.usecase";
import { UpdateProductCatalogRecipe } from "../usecases/update-recipe.usecase";
import { CreateProductCatalogPublication } from "../usecases/create-publication.usecase";
import { UpdateProductCatalogPublication } from "../usecases/update-publication.usecase";
import { ListProductCatalogChannelSkus } from "../usecases/list-channel-skus.usecase";
import { CreateProductCatalogStockItem } from "../usecases/create-stock-item.usecase";
import { GetProductCatalogStockItem } from "../usecases/get-stock-item.usecase";
import { GetProductCatalogSkuStockItem } from "../usecases/get-sku-stock-item.usecase";
import { GetSnapshotInventory } from "../usecases/get-snapshot.usecase";
import { UpsertProductCatalogInventoryBalance } from "../usecases/upsert-inventory-balance.usecase";
import { ListProductCatalogInventoryBySku } from "../usecases/list-inventory-by-sku.usecase";
import { RegisterProductCatalogInventoryMovement } from "../usecases/register-inventory-movement.usecase";
import { ListProductCatalogInventoryLedger } from "../usecases/list-inventory-ledger.usecase";
import { ListDailyMovementBySku } from "../usecases/list-daily-movement-by-sku.usecase";
import { ListProductCatalogInventoryDocuments } from "../usecases/list-inventory-documents.usecase";
import { ListProductCatalogInventorySnapshotsBySku } from "../usecases/list-snapshots.usecase";
import { ListAvailableStockUsecase } from "../usecases/list-available-stock";
import { ReserveProductCatalogMaterials } from "../usecases/reserve-materials.usecase";
import { TransferProductCatalogInventoryBetweenWarehouses } from "../usecases/transfer-between-warehouses.usecase";
import { CreateProductCatalogUnit } from "../usecases/create-unit.usecase";
import { GetProductCatalogUnit } from "../usecases/get-unit.usecase";
import { GetProductCatalogUnitByCode } from "../usecases/get-unit-by-code.usecase";
import { ListProductCatalogUnits } from "../usecases/list-units.usecase";
import { ListProductCatalogInventory } from "../usecases/list-inventory.usecase";
import { CreateProductCatalogEquivalence } from "../usecases/create-equivalence.usecase";
import { DeleteProductCatalogEquivalence } from "../usecases/delete-equivalence.usecase";
import { GetProductCatalogEquivalence } from "../usecases/get-equivalence.usecase";
import { ListProductCatalogEquivalencesByProduct } from "../usecases/list-equivalences-by-product.usecase";
import { GetProductCatalogProductDetail } from "../usecases/get-product-detail.usecase";

export const productCatalogUsecasesProviders: Provider[] = [
  CreateProductCatalogProduct,
  UpdateProductCatalogProduct,
  ListProductCatalogProducts,
  GetProductCatalogProduct,
  GetProductCatalogProductDetail,
  CreateProductCatalogSku,
  UpdateProductCatalogSku,
  GetProductCatalogSku,
  ListProductCatalogSkus,
  CreateProductCatalogRecipe,
  GetProductCatalogRecipe,
  UpdateProductCatalogRecipe,
  DeleteProductCatalogRecipeItem,
  CreateProductCatalogPublication,
  UpdateProductCatalogPublication,
  ListProductCatalogChannelSkus,
  CreateProductCatalogStockItem,
  GetProductCatalogStockItem,
  GetProductCatalogSkuStockItem,
  UpsertProductCatalogInventoryBalance,
  ListProductCatalogInventoryBySku,
  GetSnapshotInventory,
  RegisterProductCatalogInventoryMovement,
  ListProductCatalogInventoryLedger,
  ListDailyMovementBySku,
  ListProductCatalogInventoryDocuments,
  ListProductCatalogInventory,
  ListProductCatalogInventorySnapshotsBySku,
  ListAvailableStockUsecase,
  ReserveProductCatalogMaterials,
  TransferProductCatalogInventoryBetweenWarehouses,
  CreateProductCatalogUnit,
  GetProductCatalogUnit,
  GetProductCatalogUnitByCode,
  ListProductCatalogUnits,
  CreateProductCatalogEquivalence,
  DeleteProductCatalogEquivalence,
  GetProductCatalogEquivalence,
  ListProductCatalogEquivalencesByProduct,
];
