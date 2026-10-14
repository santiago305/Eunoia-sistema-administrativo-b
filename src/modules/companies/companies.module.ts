import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { CompanyController } from "./adapters/in/http/controllers/company.controller";
import { CompanyEntity } from "./adapters/out/persistence/typeorm/entities/company.entity";
import { COMPANY_REPOSITORY } from "./domain/ports/company.repository";
import { companiesModuleProviders } from "./composition/container";
import { UsersModule } from "src/modules/users/infrastructure/users.module";

@Module({
  imports: [TypeOrmModule.forFeature([CompanyEntity]), AccessControlModule, forwardRef(() => UsersModule)],
  controllers: [CompanyController],
  providers: [...companiesModuleProviders],
  exports: [COMPANY_REPOSITORY],
})
export class CompaniesModule {}
