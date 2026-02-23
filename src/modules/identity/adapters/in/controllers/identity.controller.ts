import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { LookupIdentityUsecase } from "src/modules/identity/application/usecases/lookup-identity.usecase";
import { IdentityLookupQueryDto } from "../dtos/identity-lookup.dto";

@Controller("identity")
@UseGuards(JwtAuthGuard)
export class IdentityController {
  constructor(private readonly lookupIdentity: LookupIdentityUsecase) {}

  @Get()
  lookup(@Query() query: IdentityLookupQueryDto) {
    return this.lookupIdentity.execute({
      documentType: query.documentType,
      documentNumber: query.documentNumber,
    });
  }
}
