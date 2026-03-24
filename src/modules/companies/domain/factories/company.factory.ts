import { Company } from "../entity/company";
import { CreateCompanyParams } from "../types/create-company.params";

export class CompanyFactory {
  static create(params: CreateCompanyParams): Company {
    return Company.create(params);
  }
}