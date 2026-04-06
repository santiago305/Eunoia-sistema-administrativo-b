import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompanyController } from "./adapters/in/http/controllers/company.controller";
import { CompanyEntity } from "./adapters/out/persistence/typeorm/entities/company.entity";
import { COMPANY_REPOSITORY } from "./domain/ports/company.repository";
import { companiesModuleProviders } from "./composition/container";

@Module({
  imports: [TypeOrmModule.forFeature([CompanyEntity])],
  controllers: [CompanyController],
  providers: [...companiesModuleProviders],
  exports: [COMPANY_REPOSITORY],
})
export class CompaniesModule {}
