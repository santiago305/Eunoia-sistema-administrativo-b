import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { HttpSaleOrderCreateDto } from "src/modules/sale-orders/adapters/in/dtos/http-sale-order-create.dto";
import { CreateSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/create.usecase";

@Controller("sale-orders")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class SaleOrdersController {
  constructor(
    private readonly createSaleOrder: CreateSaleOrderUsecase,
  ) {}

  @Post()
  create(@Body() dto: HttpSaleOrderCreateDto, @CurrentUser() user: { id: string }) {
    return this.createSaleOrder.execute(
      {
        warehouseId: dto.warehouseId,
        clientId: dto.clientId,
        agencyDetail: dto.agencyDetail,
        sourceId: dto.sourceId,
        scheduleDate: dto.scheduleDate,
        deliveryDate: dto.deliveryDate,
        deliveryCost: dto.deliveryCost,
        deliveryType: dto.deliveryType,
        note: dto.note,
        items: (dto.items ?? []).map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          description: item.description,
          referencePackId: item.referencePackId,
          components: item.components?.map((c) => ({
            skuId: c.skuId,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            total: c.total,
            referencePackItemId: c.referencePackItemId,
          })),
        })),
        payments: dto.payments?.map((p) => ({
          bankAccountId: p.bankAccountId,
          method: p.method,
          amount: p.amount,
          date: p.date,
          operationNumber: p.operationNumber,
          note: p.note,
        })),
      },
      user.id,
    );
  }
}
