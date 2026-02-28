import { Module } from "@nestjs/common";
import { IdentityController } from "./adapters/in/controllers/identity.controller";
import { DecolectaIdentityClient } from "./adapters/out/http/identity.client";
import { LookupIdentityUsecase } from "./application/usecases/lookup-identity.usecase";
import { IDENTITY_LOOKUP_REPOSITORY } from "./domain/ports/identity-lookup.repository";

@Module({
  controllers: [IdentityController],
  providers: [
    LookupIdentityUsecase,
    { provide: IDENTITY_LOOKUP_REPOSITORY, useClass: DecolectaIdentityClient },
  ],
})
export class IdentityModule {}
