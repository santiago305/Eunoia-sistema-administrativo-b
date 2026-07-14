import { SubsidiaryInput } from "./create.input";

export interface UpdateAgencyInput {
  agencyId: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
  subsidiaries?: SubsidiaryInput[];
}

