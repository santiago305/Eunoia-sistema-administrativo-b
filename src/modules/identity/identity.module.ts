import { Module } from "@nestjs/common";
import { IdentityController } from "./adapters/in/controllers/identity.controller";
import { identityModuleProviders } from "./composition/container";

@Module({
  controllers: [IdentityController],
  providers: [...identityModuleProviders],
})
export class IdentityModule {}
