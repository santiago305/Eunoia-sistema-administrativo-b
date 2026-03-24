import { Provider } from "@nestjs/common";
import { CreateCompanyUsecase } from "../usecases/create.usecase";
import { GetCompanyUsecase } from "../usecases/get.usecase";
import { UpdateCompanyUsecase } from "../usecases/update.usecase";
import { UpdateCompanyLogoUsecase } from "../usecases/update-logo.usecase";
import { UpdateCompanyCertUsecase } from "../usecases/update-cert.usecase";

export const companyUsecasesProviders: Provider[] = [
  CreateCompanyUsecase,
  GetCompanyUsecase,
  UpdateCompanyUsecase,
  UpdateCompanyLogoUsecase,
  UpdateCompanyCertUsecase,
];