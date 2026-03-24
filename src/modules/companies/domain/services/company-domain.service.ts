import { Company } from "../entity/company";
import { CompanyAlreadyExistsError } from "../errors/company-already-exists.error";
import { CompanyRepository } from "../ports/company.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";

export class CompanyDomainService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async createSingleCompany(
    company: Company,
    tx?: TransactionContext,
  ): Promise<Company> {
    const existingCompany = await this.companyRepository.findSingle(tx);

    if (existingCompany) {
      throw new CompanyAlreadyExistsError();
    }

    return this.companyRepository.create(company, tx);
  }
}