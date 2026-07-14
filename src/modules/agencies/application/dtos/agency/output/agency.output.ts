import { SubsidiaryOutput } from "./subsidiary.output";

export interface AgencyOutput {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  subsidiaryCount?: number;
  subsidiaries?: SubsidiaryOutput[];
}

