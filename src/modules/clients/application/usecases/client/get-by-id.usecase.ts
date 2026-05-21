import { Inject, NotFoundException } from "@nestjs/common";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import { GetClientInput } from "../../dtos/client/input/get-by-id.input";
import { ClientOutput } from "../../dtos/client/output/client.output";
import { ClientOutputMapper } from "../../mappers/client-output.mapper";
import { ClientNotFoundError } from "../../errors/client-not-found.error";

export class GetClientUsecase {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
  ) {}

  async execute(input: GetClientInput): Promise<ClientOutput> {
    const client = await this.clientRepo.findById(input.clientId);
    if (!client) {
      throw new NotFoundException(new ClientNotFoundError().message);
    }

    return ClientOutputMapper.toOutput(client);
  }
}

