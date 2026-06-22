import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { CreatePurchaseReceptionUsecase } from "src/modules/purchase-receptions/application/usecases/create-purchase-reception.usecase";
import { ConfirmPurchaseReceptionUsecase } from "src/modules/purchase-receptions/application/usecases/confirm-purchase-reception.usecase";
import { ListPurchaseReceptionsUsecase } from "src/modules/purchase-receptions/application/usecases/list-purchase-receptions.usecase";
import { HttpCreatePurchaseReceptionDto } from "../dtos/http-create-purchase-reception.dto";

@Controller("purchase-receptions")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class PurchaseReceptionsController {
  constructor(
    private readonly createReception: CreatePurchaseReceptionUsecase,
    private readonly confirmReception: ConfirmPurchaseReceptionUsecase,
    private readonly listReceptions: ListPurchaseReceptionsUsecase,
  ) {}

  @Post()
  @RequirePermissions("purchases.receive")
  async create(@Body() dto: HttpCreatePurchaseReceptionDto, @CurrentUser() user: { id: string }) {
    const created = await this.createReception.execute(
      {
        purchaseId: dto.purchaseId,
        warehouseId: dto.warehouseId,
        note: dto.note,
        evidenceUrls: dto.evidenceUrls,
        items: dto.items,
      },
      user.id,
    );
    if (dto.confirmNow) {
      const confirmed = await this.confirmReception.execute(created.receptionId!, user.id);
      return { type: "success", message: "Recepción confirmada.", reception: confirmed };
    }
    return { type: "success", message: "Recepción registrada.", reception: created };
  }

  @Get()
  @RequirePermissions("purchases.view_detail")
  list(@Query("purchaseId", ParseUUIDPipe) purchaseId: string) {
    return this.listReceptions.execute(purchaseId);
  }

  @Post(":id/confirm")
  @RequirePermissions("purchases.receive")
  async confirm(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    const reception = await this.confirmReception.execute(id, user.id);
    return { type: "success", message: "Recepción confirmada.", reception };
  }
}
