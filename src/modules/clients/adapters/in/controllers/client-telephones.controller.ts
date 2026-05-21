import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateTelephoneUsecase } from "src/modules/clients/application/usecases/telephone/create.usecase";
import { ListTelephonesByClientUsecase } from "src/modules/clients/application/usecases/telephone/list-by-client.usecase";
import { SetTelephoneMainUsecase } from "src/modules/clients/application/usecases/telephone/set-main.usecase";
import { UpdateTelephoneUsecase } from "src/modules/clients/application/usecases/telephone/update.usecase";
import { HttpCreateTelephoneDto } from "../dtos/telephone/http-telephone-create.dto";
import { HttpUpdateTelephoneDto } from "../dtos/telephone/http-telephone-update.dto";

@Controller("clients")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class ClientTelephonesController {
  constructor(
    private readonly createTelephone: CreateTelephoneUsecase,
    private readonly listTelephones: ListTelephonesByClientUsecase,
    private readonly updateTelephone: UpdateTelephoneUsecase,
    private readonly setTelephoneMain: SetTelephoneMainUsecase,
  ) {}

  @RequirePermissions("clients.manage")
  @Post(":clientId/telephones")
  create(@Param("clientId", ParseUUIDPipe) clientId: string, @Body() dto: HttpCreateTelephoneDto) {
    return this.createTelephone.execute({ clientId, number: dto.number, isMain: dto.isMain });
  }

  @RequirePermissions("clients.read")
  @Get(":clientId/telephones")
  list(@Param("clientId", ParseUUIDPipe) clientId: string) {
    return this.listTelephones.execute({ clientId });
  }

  @RequirePermissions("clients.manage")
  @Patch("telephones/:id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HttpUpdateTelephoneDto) {
    return this.updateTelephone.execute({ telephoneId: id, number: dto.number, isMain: dto.isMain });
  }

  @RequirePermissions("clients.manage")
  @Patch("telephones/:id/main")
  setMain(@Param("id", ParseUUIDPipe) id: string) {
    return this.setTelephoneMain.execute({ telephoneId: id });
  }
}
