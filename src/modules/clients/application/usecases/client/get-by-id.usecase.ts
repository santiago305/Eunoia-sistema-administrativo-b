import { Inject, NotFoundException } from "@nestjs/common";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import { TELEPHONE_REPOSITORY, TelephoneRepository } from "src/modules/clients/domain/ports/telephone.repository";
import { GetClientInput } from "../../dtos/client/input/get-by-id.input";
import { ClientDetailOutput } from "../../dtos/client/output/client-detail.output";
import { ClientOutputMapper } from "../../mappers/client-output.mapper";
import { ClientNotFoundError } from "../../errors/client-not-found.error";
import { TelephoneOutputMapper } from "../../mappers/telephone-output.mapper";

export class GetClientUsecase {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
    @Inject(TELEPHONE_REPOSITORY)
    private readonly telephoneRepo: TelephoneRepository,
  ) {}

  async execute(input: GetClientInput): Promise<ClientDetailOutput> {
    const client = await this.clientRepo.findById(input.clientId);
    if (!client) {
      throw new NotFoundException(new ClientNotFoundError().message);
    }

    const telephones = await this.telephoneRepo.listByClientId(input.clientId);

    return {
      ...ClientOutputMapper.toOutput(client),
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      telephones: telephones.map((tel) => TelephoneOutputMapper.toOutput(tel)),
    };
  }
}
