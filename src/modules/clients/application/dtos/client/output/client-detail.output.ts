import { ClientOutput } from "./client.output";
import { TelephoneOutput } from "../../telephone/output/telephone.output";

export interface ClientDetailOutput extends ClientOutput {
  createdAt?: Date;
  updatedAt?: Date;
  telephones: TelephoneOutput[];
}
