import { Inject } from "@nestjs/common";
import {
  IDENTITY_LOOKUP_REPOSITORY,
  IdentityLookupRepository,
} from "src/modules/identity/domain/ports/identity-lookup.repository";
import { DniData, IdentityLookupResult, RucData } from "../dtos/out";

export class LookupIdentityUsecase {
  constructor(
    @Inject(IDENTITY_LOOKUP_REPOSITORY)
    private readonly identityRepo: IdentityLookupRepository,
  ) {}

  execute(params: {
    documentType: string;
    documentNumber: string;
  }): Promise<IdentityLookupResult<DniData | RucData>> {
    return this.identityRepo.lookup(params);
  }
}
