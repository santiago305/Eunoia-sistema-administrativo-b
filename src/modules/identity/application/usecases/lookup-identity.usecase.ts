import { Inject } from "@nestjs/common";
import {
  IDENTITY_LOOKUP_REPOSITORY,
  IdentityLookupRepository,
} from "src/modules/identity/domain/ports/identity-lookup.repository";
import { DniData, IdentityLookupResult, RucData } from "../dtos/out";
import { LookupIdentityInput } from "../dtos/lookup-identity.input";
import { IdentityLookupMapper } from "../mappers/identity-lookup.mapper";

export class LookupIdentityUsecase {
  constructor(
    @Inject(IDENTITY_LOOKUP_REPOSITORY)
    private readonly identityRepo: IdentityLookupRepository,
  ) {}

  async execute(input: LookupIdentityInput): Promise<IdentityLookupResult<DniData | RucData>> {
    const result = await this.identityRepo.lookup(input);
    return IdentityLookupMapper.toOutput(result);
  }
}
