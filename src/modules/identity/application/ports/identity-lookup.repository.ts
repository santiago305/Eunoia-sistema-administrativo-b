export const IDENTITY_LOOKUP_REPOSITORY = Symbol('IDENTITY_LOOKUP_REPOSITORY');

export interface IdentityLookupResult {
  documentType: string;
  documentNumber: string;
  data: unknown;
}

export interface IdentityLookupRepository {
  lookup(params: { documentType: string; documentNumber: string }): Promise<IdentityLookupResult>;
}
