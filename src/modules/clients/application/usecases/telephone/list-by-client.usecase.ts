import { Inject } from "@nestjs/common";
import {
  TELEPHONE_REPOSITORY,
  TelephoneRepository,
} from "src/modules/clients/domain/ports/telephone.repository";
import { ListTelephonesByClientInput } from "../../dtos/telephone/input/list-by-client.input";
import { TelephoneOutput } from "../../dtos/telephone/output/telephone.output";
import { TelephoneOutputMapper } from "../../mappers/telephone-output.mapper";

export class ListTelephonesByClientUsecase {
  constructor(
    @Inject(TELEPHONE_REPOSITORY)
    private readonly telephoneRepo: TelephoneRepository,
  ) {}

  async execute(input: ListTelephonesByClientInput): Promise<TelephoneOutput[]> {
    const items = await this.telephoneRepo.listByClientId(input.clientId);
    return items.map((tel) => TelephoneOutputMapper.toOutput(tel));
  }
}

