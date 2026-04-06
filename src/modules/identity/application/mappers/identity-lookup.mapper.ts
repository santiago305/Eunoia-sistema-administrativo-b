import { LookupIdentityInput } from "../dtos/lookup-identity.input";
import { IdentityLookupResult } from "../dtos/out";

export class IdentityLookupMapper {
  static toInput(params: {
    documentType: string;
    documentNumber: string;
  }): LookupIdentityInput {
    return {
      documentType: params.documentType.trim(),
      documentNumber: params.documentNumber.trim(),
    };
  }

  static toOutput<TData>(result: IdentityLookupResult<TData>) {
    return {
      documentType: result.documentType,
      documentNumber: result.documentNumber,
      data: result.data,
    };
  }
}
