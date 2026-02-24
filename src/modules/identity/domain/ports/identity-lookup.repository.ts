import { DniData, IdentityLookupResult, RucData } from "src/modules/identity/application/dtos/out";

export const IDENTITY_LOOKUP_REPOSITORY = Symbol("IDENTITY_LOOKUP_REPOSITORY");

export interface IdentityLookupRepository {
  lookup(params: {
    documentType: string;
    documentNumber: string;
  }): Promise<IdentityLookupResult<DniData | RucData>>;
}
