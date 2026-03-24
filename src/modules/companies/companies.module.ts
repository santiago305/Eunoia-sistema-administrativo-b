import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { IMAGE_PROCESSOR } from "src/shared/application/ports/image-processor.port";
import { FILE_STORAGE } from "src/shared/application/ports/file-storage.port";
import { SharpImageProcessorService } from "src/shared/utilidades/services/sharp-image-processor.service";
import { LocalFileStorageService } from "src/shared/utilidades/services/local-file-storage.service";
import { CompanyController } from "./adapters/in/controllers/company.controller";
import { CompanyEntity } from "./adapters/out/persistence/typeorm/entities/company.entity";
import { CompanyTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/company.typeorm.repo";
import { CreateCompanyUsecase } from "./application/usecases/create.usecase";
import { UpdateCompanyUsecase } from "./application/usecases/update.usecase";
import { GetCompanyUsecase } from "./application/usecases/get.usecase";
import { UpdateCompanyLogoUsecase } from "./application/usecases/update-logo.usecase";
import { UpdateCompanyCertUsecase } from "./application/usecases/update-cert.usecase";
import { COMPANY_REPOSITORY } from "./domain/ports/company.repository";
import { CLOCK } from "../inventory/application/ports/clock.port";

@Module({
  imports: [TypeOrmModule.forFeature([CompanyEntity])],
  controllers: [CompanyController],
  providers: [
    CreateCompanyUsecase,
    UpdateCompanyUsecase,
    GetCompanyUsecase,
    UpdateCompanyLogoUsecase,
    UpdateCompanyCertUsecase,
    { provide: COMPANY_REPOSITORY, useClass: CompanyTypeormRepository },
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
    { provide: CLOCK, useValue: { now: () => new Date() } },
    { provide: IMAGE_PROCESSOR, useClass: SharpImageProcessorService },
    { provide: FILE_STORAGE, useClass: LocalFileStorageService },
  ],
  exports: [COMPANY_REPOSITORY],
})
export class CompaniesModule {}
