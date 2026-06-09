import { SubsidiaryOutput } from "./subsidiary.output";

export interface AgencyOutput {
  id: string;
  name: string;
  isActive: boolean;
  subsidiaryCount?: number;
  subsidiaries?: SubsidiaryOutput[];
}

