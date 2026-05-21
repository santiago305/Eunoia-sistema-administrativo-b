import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import {
  TELEPHONE_REPOSITORY,
  TelephoneRepository,
} from "src/modules/clients/domain/ports/telephone.repository";
import { ClientFactory } from "src/modules/clients/domain/factories/client.factory";
import { ClientId } from "src/modules/clients/domain/value-objects/client-id.vo";
import { CreateTelephoneInput } from "../../dtos/telephone/input/create.input";
import { ClientNotFoundError } from "../../errors/client-not-found.error";

export class CreateTelephoneUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
    @Inject(TELEPHONE_REPOSITORY)
    private readonly telephoneRepo: TelephoneRepository,
  ) {}

  async execute(input: CreateTelephoneInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const client = await this.clientRepo.findById(input.clientId, tx);
      if (!client) {
        throw new NotFoundException(new ClientNotFoundError().message);
      }
      if (!client.isActive) {
        throw new BadRequestException("No puedes modificar telefonos de un cliente deshabilitado");
      }

      const isMain = input.isMain ?? false;
      if (isMain) {
        await this.telephoneRepo.unsetMainByClientId(input.clientId, tx);
      }

      const tel = ClientFactory.createTelephone({
        clientId: new ClientId(input.clientId),
        number: input.number,
        isMain,
      });

      try {
        await this.telephoneRepo.create(tel, tx);
      } catch {
        throw new BadRequestException("No se pudo crear el telefono");
      }

      return { message: "Telefono creado con exito" };
    });
  }
}
