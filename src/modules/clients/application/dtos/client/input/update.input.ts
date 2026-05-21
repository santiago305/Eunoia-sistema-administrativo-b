import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { TelephoneReplaceInput } from "../../telephone/input/telephone-replace.input";

export interface UpdateClientInput {
  clientId: string;
  type?: ClientType;
  fullName?: string;
  docType?: ClientDocType;
  docNumber?: string;
  reference?: string;
  address?: string;
  departmentId?: string;
  provinceId?: string;
  districtId?: string;
  telephonesReplace?: TelephoneReplaceInput[];
}
