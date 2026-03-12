import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Company } from "../entity/company";

export const COMPANY_REPOSITORY = Symbol("COMPANY_REPOSITORY");

export interface CompanyRepository {
  findSingle(tx?: TransactionContext): Promise<Company | null>;
  findById(companyId: string, tx?: TransactionContext): Promise<Company | null>;
  existsByEmail(email: string, tx?: TransactionContext): Promise<boolean>;
  create(company: Company, tx?: TransactionContext): Promise<Company>;
  update(
    params: {
      companyId: string;
      name?: string;
      ruc?: string;
      ubigeo?: string;
      department?: string;
      province?: string;
      district?: string;
      urbanization?: string;
      address?: string;
      phone?: string;
      email?: string;
      codLocal?: string;
      solUser?: string;
      solPass?: string;
      logoPath?: string;
      certPath?: string;
      production?: boolean;
      isActive?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<Company | null>;
}
