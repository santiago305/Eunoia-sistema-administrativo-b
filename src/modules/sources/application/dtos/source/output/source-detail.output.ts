import { SourceOutput } from "./source.output";

export interface SourceDetailOutput extends SourceOutput {
  createdAt?: Date;
  updatedAt?: Date;
}

