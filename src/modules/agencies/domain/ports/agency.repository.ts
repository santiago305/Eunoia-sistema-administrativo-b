import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Agency } from "../entities/agency";
import { Subsidiary } from "../entities/subsidiary";
import { AgencySearchRule } from "src/modules/agencies/application/dtos/agency-search/agency-search-snapshot";

export const AGENCY_REPOSITORY = Symbol("AGENCY_REPOSITORY");

export interface AgencyRepository {
  findById(agencyId: string, tx?: TransactionContext): Promise<Agency | null>;
  create(agency: Agency, tx?: TransactionContext): Promise<Agency>;
  update(
    params: {
      agencyId: string;
      name?: string;
      isActive?: boolean;
      description?: string | null;
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
  createWithSubsidiaries(
    agency: Agency,
    subsidiaries: Subsidiary[],
    tx?: TransactionContext,
  ): Promise<Agency>;
  updateWithSubsidiaries(
    params: {
      agencyId: string;
      name?: string;
      isActive?: boolean;
      description?: string | null;
      updatedAt?: Date;
      subsidiaries?: Subsidiary[];
    },
    tx?: TransactionContext,
  ): Promise<Agency | null>;
  findByIdWithSubsidiaries(
    agencyId: string,
    params?: { includeInactiveSubsidiaries?: boolean },
    tx?: TransactionContext,
  ): Promise<{ agency: Agency; subsidiaries: Subsidiary[] } | null>;
  listSubsidiaries(
    params: { q?: string; agencyId?: string; isActive?: boolean },
    tx?: TransactionContext,
  ): Promise<Subsidiary[]>;
  findExistingSubsidiaryAliases(
    aliases: string[],
    tx?: TransactionContext,
  ): Promise<string[]>;
  findReferencedSubsidiaryIds(
    subsidiaryIds: string[],
    tx?: TransactionContext,
  ): Promise<string[]>;
}

