import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateSupplierPaymentDestinationDto } from "../dtos/create-supplier-payment-destination.dto";
import { UpdateSupplierPaymentDestinationDto } from "../dtos/update-supplier-payment-destination.dto";
import { CreateSupplierPaymentDestinationUsecase } from "../../../application/usecases/create-destination.usecase";
import { ListSupplierPaymentDestinationsUsecase } from "../../../application/usecases/list-destinations.usecase";
import { UpdateSupplierPaymentDestinationUsecase } from "../../../application/usecases/update-destination.usecase";
import { SetDefaultSupplierPaymentDestinationUsecase } from "../../../application/usecases/set-default-destination.usecase";

@Controller("supplier-payment-destinations")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class SupplierPaymentDestinationsController {
  constructor(private readonly createDestination: CreateSupplierPaymentDestinationUsecase, private readonly listDestinations: ListSupplierPaymentDestinationsUsecase, private readonly updateDestination: UpdateSupplierPaymentDestinationUsecase, private readonly setDefault: SetDefaultSupplierPaymentDestinationUsecase) {}

  @RequirePermissions("suppliers.payment_methods.manage")
  @Post()
  create(@Body() dto: CreateSupplierPaymentDestinationDto) { return this.createDestination.execute(dto); }

  @RequirePermissions("suppliers.payment_methods.manage")
  @Get("by-supplier/:supplierId")
  list(@Param("supplierId", ParseUUIDPipe) supplierId: string, @Query("currency") currency?: string, @Query("methodId") methodId?: string, @Query("includeInactive") includeInactive?: string) {
    return this.listDestinations.execute({ supplierId, currency, methodId, includeInactive: includeInactive === "true" });
  }

  @RequirePermissions("suppliers.payment_methods.manage")
  @Patch(":destinationId")
  update(@Param("destinationId", ParseUUIDPipe) destinationId: string, @Body() dto: UpdateSupplierPaymentDestinationDto) { return this.updateDestination.execute(destinationId, dto); }

  @RequirePermissions("suppliers.payment_methods.manage")
  @Post(":destinationId/default")
  makeDefault(@Param("destinationId", ParseUUIDPipe) destinationId: string) { return this.setDefault.execute(destinationId); }
}
