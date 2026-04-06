import { COMPANY_REPOSITORY } from "../domain/ports/company.repository";
import { companyUsecasesProviders } from "../application/providers/company-usecases.providers";
import { CompanyTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/company.typeorm.repo";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { CLOCK } from "src/modules/inventory/application/ports/clock.port";
import { IMAGE_PROCESSOR } from "src/shared/application/ports/image-processor.port";
import { FILE_STORAGE } from "src/shared/application/ports/file-storage.port";
import { SharpImageProcessorService } from "src/shared/utilidades/services/sharp-image-processor.service";
import { LocalFileStorageService } from "src/shared/utilidades/services/local-file-storage.service";

export const companiesModuleProviders = [
  ...companyUsecasesProviders,
  { provide: COMPANY_REPOSITORY, useClass: CompanyTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
  { provide: IMAGE_PROCESSOR, useClass: SharpImageProcessorService },
  { provide: FILE_STORAGE, useClass: LocalFileStorageService },
];
