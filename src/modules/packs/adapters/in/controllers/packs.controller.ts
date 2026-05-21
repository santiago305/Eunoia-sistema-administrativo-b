import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreatePackUsecase } from "src/modules/packs/application/usecases/pack/create.usecase";
import { ListPacksUsecase } from "src/modules/packs/application/usecases/pack/list.usecase";
import { GetPackUsecase } from "src/modules/packs/application/usecases/pack/get-by-id.usecase";
import { SetPackActiveUsecase } from "src/modules/packs/application/usecases/pack/set-active.usecase";
import { ListPacksQueryDto } from "../dtos/list-packs.query.dto";
import { HttpCreatePackDto } from "../dtos/http-pack-create.dto";
import { HttpSetPackActiveDto } from "../dtos/http-pack-set-active.dto";

@Controller("packs")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class PacksController {
  constructor(
    private readonly createPack: CreatePackUsecase,
    private readonly listPacks: ListPacksUsecase,
    private readonly getPack: GetPackUsecase,
    private readonly setPackActive: SetPackActiveUsecase,
  ) {}

  @RequirePermissions("packs.manage")
  @Post()
  create(@Body() dto: HttpCreatePackDto) {
    return this.createPack.execute({
      description: dto.description,
      total: dto.total,
      isActive: dto.isActive,
      items: dto.items,
    });
  }

  @RequirePermissions("packs.read")
  @Get()
  list(@Query() query: ListPacksQueryDto) {
    const isActive = query.isActive === undefined ? undefined : query.isActive === "true";
    const page = query.page ? Number(query.page) : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;
    return this.listPacks.execute({ q: query.q, isActive, page, limit });
  }

  @RequirePermissions("packs.read")
  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getPack.execute({ packId: id });
  }

  @RequirePermissions("packs.manage")
  @Patch(":id/active")
  setActive(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpSetPackActiveDto) {
    return this.setPackActive.execute({ packId: id, isActive: dto.isActive });
  }
}
