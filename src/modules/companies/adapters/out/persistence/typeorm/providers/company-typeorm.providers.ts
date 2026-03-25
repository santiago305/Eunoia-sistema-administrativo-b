import { Provider } from "@nestjs/common";
import { COMPANY_REPOSITORY } from "src/modules/companies/domain/ports/company.repository";
import { CompanyTypeormRepository } from "../repositories/company.typeorm.repo";

export const companyTypeormProviders: Provider[] = [
  {
    provide: COMPANY_REPOSITORY,
    useClass: CompanyTypeormRepository,
  },
];