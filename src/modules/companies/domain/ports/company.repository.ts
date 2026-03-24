import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Company } from "../entity/company";
import { UpdateCompanyParams } from "../types/update-company.params";

export const COMPANY_REPOSITORY = Symbol("COMPANY_REPOSITORY");

export interface CompanyRepository {
  findSingle(tx?: TransactionContext): Promise<Company | null>;
  findById(companyId: string, tx?: TransactionContext): Promise<Company | null>;
  existsByEmail(email: string, tx?: TransactionContext): Promise<boolean>;
  create(company: Company, tx?: TransactionContext): Promise<Company>;
  update(
    params: UpdateCompanyParams & {
      companyId: string;
      logoPath?: string;
      certPath?: string;
      createdAt?: Date;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<Company | null>;
}