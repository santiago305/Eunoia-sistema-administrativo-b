import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { GetProductCatalogUnit } from "src/modules/product-catalog/application/usecases/get-unit.usecase";
import { GetProductCatalogUnitByCode } from "src/modules/product-catalog/application/usecases/get-unit-by-code.usecase";
import { ListProductCatalogUnits } from "src/modules/product-catalog/application/usecases/list-units.usecase";
import { ListProductCatalogUnitsDto } from "../dtos/list-units.dto";

@Controller("units")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductCatalogUnitController {
  constructor(
    private readonly listUnits: ListProductCatalogUnits,
    private readonly getUnit: GetProductCatalogUnit,
    private readonly getUnitByCode: GetProductCatalogUnitByCode,
  ) {}

  @RequirePermissions("catalog.read")
  @Get()
  list(@Query() query: ListProductCatalogUnitsDto) {
    return this.listUnits.execute({
      q: query.q,
    });
  }

  @RequirePermissions("catalog.read")
  @Get("code/:code")
  getByCode(@Param("code") code: string) {
    return this.getUnitByCode.execute(code);
  }

  @RequirePermissions("catalog.read")
  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getUnit.execute(id);
  }
}
