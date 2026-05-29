import { Module } from "@nestjs/common";
import { IdentityController } from "./adapters/in/controllers/identity.controller";
import { identityModuleProviders } from "./composition/container";
import { AccessControlModule } from "../access-control/infrastructure/access-control.module";

@Module({
  imports: [AccessControlModule],
  controllers: [IdentityController],
  providers: [...identityModuleProviders],
})
export class IdentityModule {}
