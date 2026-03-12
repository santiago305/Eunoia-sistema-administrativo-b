import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CompanyMethod } from "../entity/company-method";

export const COMPANY_METHOD_REPOSITORY = Symbol("COMPANY_METHOD_REPOSITORY");

export interface CompanyMethodRepository {
  findById(companyId: string, methodId: string, tx?: TransactionContext): Promise<CompanyMethod | null>;
  create(method: CompanyMethod, tx?: TransactionContext): Promise<CompanyMethod>;
  delete(companyId: string, methodId: string, tx?: TransactionContext): Promise<boolean>;
}
