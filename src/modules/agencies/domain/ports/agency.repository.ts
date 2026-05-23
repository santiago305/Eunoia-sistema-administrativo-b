import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Agency } from "../entities/agency";
import { AgencySearchRule } from "src/modules/agencies/application/dtos/agency-search/agency-search-snapshot";

export const AGENCY_REPOSITORY = Symbol("AGENCY_REPOSITORY");

export interface AgencyRepository {
  findById(agencyId: string, tx?: TransactionContext): Promise<Agency | null>;
  create(agency: Agency, tx?: TransactionContext): Promise<Agency>;
  update(
    params: {
      agencyId: string;
      name?: string;
      reference?: string;
      address?: string;
      departmentId?: string;
      provinceId?: string;
      districtId?: string;
      isActive?: boolean;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<Agency | null>;
  setActive(agencyId: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
  list(
    params: {
      q?: string;
      isActive?: boolean;
      filters?: AgencySearchRule[];
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: Agency[]; total: number }>;
}

