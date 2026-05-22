import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { TelephoneReplaceInput } from "../../telephone/input/telephone-replace.input";

export interface CreateClientInput {
  type: ClientType;
  fullName: string;
  docType: ClientDocType;
  docNumber: string;
  reference?: string;
  address?: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  isActive?: boolean;
  telephonesReplace?: TelephoneReplaceInput[];
}
