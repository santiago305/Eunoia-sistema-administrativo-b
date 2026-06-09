import { SubsidiaryInput } from "./create.input";

export interface UpdateAgencyInput {
  agencyId: string;
  name?: string;
  isActive?: boolean;
  subsidiaries?: SubsidiaryInput[];
}

