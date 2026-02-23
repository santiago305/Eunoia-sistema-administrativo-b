import { Inject } from "@nestjs/common";
import {
  IDENTITY_LOOKUP_REPOSITORY,
  IdentityLookupRepository,
  IdentityLookupResult,
} from "src/modules/identity/application/ports/identity-lookup.repository";

export class LookupIdentityUsecase {
  constructor(
    @Inject(IDENTITY_LOOKUP_REPOSITORY)
    private readonly identityRepo: IdentityLookupRepository,
  ) {}

  execute(params: { documentType: string; documentNumber: string }): Promise<IdentityLookupResult> {
    return this.identityRepo.lookup(params);
  }
}
