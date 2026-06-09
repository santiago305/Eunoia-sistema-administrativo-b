import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateSaleOrderStateUseCase } from "../../../application/usecases/create-sale-order-state.usecase";
import { GetSaleOrderStateUseCase } from "../../../application/usecases/get-sale-order-state.usecase";
import { ListSaleOrderStatesUseCase } from "../../../application/usecases/list-sale-order-states.usecase";
import { UpdateSaleOrderStateUseCase } from "../../../application/usecases/update-sale-order-state.usecase";
import { CreateSaleOrderStateDto } from "../dtos/create-sale-order-state.dto";
import { UpdateSaleOrderStateDto } from "../dtos/update-sale-order-state.dto";

@Controller("sale-order-states")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class SaleOrderStatesController {
  constructor(
    private readonly createSaleOrderState: CreateSaleOrderStateUseCase,
    private readonly listSaleOrderStates: ListSaleOrderStatesUseCase,
    private readonly getSaleOrderState: GetSaleOrderStateUseCase,
    private readonly updateSaleOrderState: UpdateSaleOrderStateUseCase,
  ) {}

  @Post()
  create(@Body() dto: CreateSaleOrderStateDto) {
    return this.createSaleOrderState.execute({ code: dto.code, name: dto.name, color: dto.color });
  }

  @Get()
  list() {
    return this.listSaleOrderStates.execute();
  }

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) saleOrderStateId: string) {
    return this.getSaleOrderState.execute({ saleOrderStateId });
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) saleOrderStateId: string, @Body() dto: UpdateSaleOrderStateDto) {
    return this.updateSaleOrderState.execute({ saleOrderStateId, name: dto.name, color: dto.color });
  }
}
