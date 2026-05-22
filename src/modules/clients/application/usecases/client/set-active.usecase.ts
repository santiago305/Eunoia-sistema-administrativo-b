import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import { SetClientActiveInput } from "../../dtos/client/input/set-active.input";
import { ClientNotFoundError } from "../../errors/client-not-found.error";

export class SetClientActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
  ) {}

  async execute(input: SetClientActiveInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.clientRepo.findById(input.clientId, tx);
      if (!current) {
        throw new NotFoundException(new ClientNotFoundError().message);
      }

      try {
        await this.clientRepo.setActive(input.clientId, input.isActive, tx);
      } catch {
        throw new BadRequestException("No se pudo actualizar el estado del cliente");
      }

      return { message: "Estado del cliente actualizado" };
    });
  }
}

