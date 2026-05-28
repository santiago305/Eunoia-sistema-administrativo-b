import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { LookupIdentityUsecase } from "src/modules/identity/application/usecases/lookup-identity.usecase";
import { IdentityLookupQueryDto } from "../dtos/identity-lookup.dto";
import { IdentityHttpMapper } from "../mappers/identity-http.mapper";

@Controller("identity")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IdentityController {
  constructor(private readonly lookupIdentity: LookupIdentityUsecase) {}

  @Get()
  @RequirePermissions("identity.lookup")
  lookup(@Query() query: IdentityLookupQueryDto) {
    return this.lookupIdentity.execute(IdentityHttpMapper.toInput(query));
  }
}
