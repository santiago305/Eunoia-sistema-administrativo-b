import { AgencyOutput } from "./agency.output";

export interface AgencyDetailOutput extends AgencyOutput {
  createdAt?: Date;
  updatedAt?: Date;
}
