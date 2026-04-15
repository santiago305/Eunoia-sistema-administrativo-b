import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateProductCatalogStockItem } from "src/modules/product-catalog/application/usecases/create-stock-item.usecase";
import { GetProductCatalogStockItem } from "src/modules/product-catalog/application/usecases/get-stock-item.usecase";
import { GetProductCatalogSkuStockItem } from "src/modules/product-catalog/application/usecases/get-sku-stock-item.usecase";
import { ListProductCatalogInventoryBySku } from "src/modules/product-catalog/application/usecases/list-inventory-by-sku.usecase";
import { UpsertProductCatalogInventoryBalance } from "src/modules/product-catalog/application/usecases/upsert-inventory-balance.usecase";
import { CreateProductCatalogStockItemDto } from "../dtos/create-stock-item.dto";
import { RegisterProductCatalogInventoryMovementDto } from "../dtos/register-inventory-movement.dto";
import { UpsertProductCatalogInventoryBalanceDto } from "../dtos/upsert-inventory-balance.dto";
import { RegisterProductCatalogInventoryMovement } from "src/modules/product-catalog/application/usecases/register-inventory-movement.usecase";
import { ListProductCatalogInventoryLedger } from "src/modules/product-catalog/application/usecases/list-inventory-ledger.usecase";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";

@Controller()
@UseGuards(JwtAuthGuard)
export class ProductCatalogStockController {
  constructor(
    private readonly createStockItem: CreateProductCatalogStockItem,
    private readonly getStockItem: GetProductCatalogStockItem,
    private readonly getSkuStockItem: GetProductCatalogSkuStockItem,
    private readonly upsertInventoryBalance: UpsertProductCatalogInventoryBalance,
    private readonly listInventoryBySku: ListProductCatalogInventoryBySku,
    private readonly registerMovement: RegisterProductCatalogInventoryMovement,
    private readonly listLedger: ListProductCatalogInventoryLedger,
  ) {}

  @Post("skus/:id/stock-item")
  createForSku(@Param("id", ParseUUIDPipe) skuId: string, @Body() dto: CreateProductCatalogStockItemDto) {
    return this.createStockItem.execute({ skuId, ...dto });
  }

  @Get("skus/:id/stock-item")
  getBySku(@Param("id", ParseUUIDPipe) skuId: string) {
    return this.getSkuStockItem.execute(skuId);
  }

  @Get("stock-items/:id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getStockItem.execute(id);
  }

  @Get("skus/:id/stock")
  listBySku(@Param("id", ParseUUIDPipe) skuId: string) {
    return this.listInventoryBySku.execute(skuId);
  }

  @Post("stock-items/:id/balances")
  upsertBalance(@Param("id", ParseUUIDPipe) stockItemId: string, @Body() dto: UpsertProductCatalogInventoryBalanceDto) {
    return this.upsertInventoryBalance.execute({ stockItemId, ...dto });
  }

  @Post("stock-items/movements/create")
  registerInventoryMovement(
    @CurrentUser() user: { id: string },
    @Body() dto: RegisterProductCatalogInventoryMovementDto,
  ) {
    return this.registerMovement.execute({ ...dto, createdBy:user.id });
  }

  @Get("stock-items/:id/ledger")
  ledger(@Param("id", ParseUUIDPipe) stockItemId: string) {
    return this.listLedger.execute(stockItemId);
  }
}

