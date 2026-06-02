import {
  BadRequestException,
  ConflictException,
  Inject,
  InternalServerErrorException,
} from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { UBIGEO_REPOSITORY, UbigeoRepository } from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { ClientFactory } from "src/modules/clients/domain/factories/client.factory";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import {
  TELEPHONE_REPOSITORY,
  TelephoneRepository,
} from "src/modules/clients/domain/ports/telephone.repository";
import { CreateClientInput } from "../../dtos/client/input/create.input";
import { UbigeoDepartmentId } from "src/modules/clients/domain/value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "src/modules/clients/domain/value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "src/modules/clients/domain/value-objects/ubigeo-district-id.vo";
import { InvalidUbigeoSelectionError } from "src/modules/clients/domain/errors/invalid-ubigeo-selection.error";
import { ClientId } from "src/modules/clients/domain/value-objects/client-id.vo";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { InvalidClientError } from "src/modules/clients/domain/errors/invalid-client.error";

export class CreateClientUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
    @Inject(TELEPHONE_REPOSITORY)
    private readonly telephoneRepo: TelephoneRepository,
    @Inject(UBIGEO_REPOSITORY)
    private readonly ubigeoRepo: UbigeoRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateClientInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      await this.executeInTransaction(input, tx);
      return { message: "Cliente creado con exito" };
    });
  }

  async executeInTransaction(input: CreateClientInput, tx: TransactionContext): Promise<string> {
      const docNumber = input.docNumber?.trim() ?? "";
      if (input.docType !== ClientDocType.NONE) {
        if (!docNumber) {
          throw new BadRequestException("El numero de documento es invalido");
        }

        const exists = await this.clientRepo.findByDocument(input.docType, docNumber, tx);
        if (exists) {
          throw new ConflictException("Cliente ya existe");
        }
      }

      let departmentId: UbigeoDepartmentId;
      let provinceId: UbigeoProvinceId;
      let districtId: UbigeoDistrictId;
      try {
        departmentId = new UbigeoDepartmentId(input.departmentId);
        provinceId = new UbigeoProvinceId(input.provinceId);
        districtId = new UbigeoDistrictId(input.districtId);
      } catch {
        throw new BadRequestException("Ubigeo invalido");
      }

      const districtRecord = await this.ubigeoRepo.findByDistrictCode(districtId.value);
      if (!districtRecord) {
        throw new BadRequestException(new InvalidUbigeoSelectionError("Distrito no existe").message);
      }
      if (
        districtRecord.department.id !== departmentId.value ||
        districtRecord.province.id !== provinceId.value
      ) {
        throw new BadRequestException(new InvalidUbigeoSelectionError().message);
      }

      const now = this.clock.now();
      let client;
      try {
        client = ClientFactory.createClient({
          type: input.type,
          fullName: input.fullName,
          docType: input.docType,
          docNumber,
          reference: input.reference,
          address: input.address,
          departmentId,
          provinceId,
          districtId,
          isActive: input.isActive ?? true,
          createdAt: now,
        });
      } catch (error) {
        if (error instanceof InvalidClientError) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }

      try {
        await this.clientRepo.create(client, tx);
      } catch (error) {
        if ((error as any)?.code === "23505") {
          throw new ConflictException("Documento ya registrado");
        }
        throw new InternalServerErrorException("No se pudo crear el cliente");
      }

      const phones = input.telephonesReplace ?? [];
      const requestedMains = phones.filter((p) => p.isMain === true);

      if (requestedMains.length > 1) {
        throw new BadRequestException("Solo un telefono puede ser principal");
      }

      for (const phone of phones) {
        if (!phone.number) {
          throw new BadRequestException("number es obligatorio para crear telefono");
        }

        const tel = ClientFactory.createTelephone({
          clientId: new ClientId(client.clientId.value),
          number: phone.number,
          isMain: phone.isMain ?? false,
        });

        await this.telephoneRepo.create(tel, tx);
      }

      return client.clientId.value;
  }
}
