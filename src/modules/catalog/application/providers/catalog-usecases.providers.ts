import { Provider } from "@nestjs/common";
import { GetCatalogSummary } from "../usecases/catalog/get-summary.usecase";
import { ListChannelCatalogItems } from "../usecases/catalog-publication/list-channel-items.usecase";
import { CreateCatalogPublication } from "../usecases/catalog-publication/create.usecase";
import { UpdateCatalogPublication } from "../usecases/catalog-publication/update.usecase";
import { CreateProduct } from "../usecases/product/created.usecase";
import { GetProductById } from "../usecases/product/get-by-id.usecase";
import { GetProductByName } from "../usecases/product/get-by-name.usecase";
import { GetProductWithVariants } from "../usecases/product/get-with-variants.usecase";
import { ListFinishedActiveProducts } from "../usecases/product/list-finished-active.usecase";
import { ListPrimaActiveProducts } from "../usecases/product/list-prima-active.usecase";
import { SearchProductsPaginated } from "../usecases/product/search-paginated.usecase";
import { SearchFlatProductsPaginated } from "../usecases/product/search-flat.usecase";
import { SetProductActive } from "../usecases/product/set-active.usecase";
import { UpdateProduct } from "../usecases/product/update.usecase";
import { CreateProductEquivalence } from "../usecases/product-equivalence/create.usecase";
import { DeleteProductEquivalence } from "../usecases/product-equivalence/delete.usecase";
import { ListProductEquivalencesByVariant } from "../usecases/product-equivalence/list-by-variant.usecase";
import { CreateProductRecipe } from "../usecases/product-recipe/create.usecase";
import { DeleteProductRecipe } from "../usecases/product-recipe/delete.usecase";
import { ListProductRecipesByVariant } from "../usecases/product-recipe/list-by-variant.usecase";
import { CreateProductVariant } from "../usecases/product-variant/create.usecase";
import { GetProductVariant } from "../usecases/product-variant/get-element-by-id.usercase";
import { ListFinishedWithRecipesProductVariants } from "../usecases/product-variant/list-finished-with-recipes.usecase";
import { ListProductVariants } from "../usecases/product-variant/list-by-product.usecase";
import { ListRowMaterialProductVariants } from "../usecases/product-variant/list-row-material.usecase";
import { SearchRowMaterialProductVariants } from "../usecases/product-variant/search-row-material.usecase";
import { SearchProductVariants } from "../usecases/product-variant/search.usecase";
import { SetProductVariantActive } from "../usecases/product-variant/set-active.usecase";
import { UpdateProductVariant } from "../usecases/product-variant/update.usecase";
import { ListUnits } from "../usecases/unit/list.usecase";

export const catalogUsecasesProviders: Provider[] = [
  CreateProduct,
  UpdateProduct,
  SetProductActive,
  GetProductWithVariants,
  GetProductById,
  GetProductByName,
  ListFinishedActiveProducts,
  ListPrimaActiveProducts,
  SearchProductsPaginated,
  SearchFlatProductsPaginated,
  CreateProductVariant,
  UpdateProductVariant,
  SetProductVariantActive,
  GetProductVariant,
  ListRowMaterialProductVariants,
  ListFinishedWithRecipesProductVariants,
  SearchRowMaterialProductVariants,
  SearchProductVariants,
  ListProductVariants,
  ListUnits,
  CreateProductEquivalence,
  DeleteProductEquivalence,
  ListProductEquivalencesByVariant,
  CreateProductRecipe,
  DeleteProductRecipe,
  ListProductRecipesByVariant,
  GetCatalogSummary,
  ListChannelCatalogItems,
  CreateCatalogPublication,
  UpdateCatalogPublication,
];
