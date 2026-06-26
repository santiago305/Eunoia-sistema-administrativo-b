import {
  BadRequestException,
  ConflictException,
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { UBIGEO_REPOSITORY, UbigeoRepository } from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import {
  TELEPHONE_REPOSITORY,
  TelephoneRepository,
} from "src/modules/clients/domain/ports/telephone.repository";
import { UpdateClientInput } from "../../dtos/client/input/update.input";
import { ClientNotFoundError } from "../../errors/client-not-found.error";
import { UbigeoDepartmentId } from "src/modules/clients/domain/value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "src/modules/clients/domain/value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "src/modules/clients/domain/value-objects/ubigeo-district-id.vo";
import { InvalidUbigeoSelectionError } from "src/modules/clients/domain/errors/invalid-ubigeo-selection.error";
import { Client } from "src/modules/clients/domain/entities/client";
import { ClientFactory } from "src/modules/clients/domain/factories/client.factory";
import { ClientId } from "src/modules/clients/domain/value-objects/client-id.vo";
import { InvalidClientError } from "src/modules/clients/domain/errors/invalid-client.error";
import {
  CLIENT_REALTIME,
  ClientRealtime,
  ClientWorkflowField,
} from "src/modules/clients/integration/client/ports/client-realtime.port";

export class UpdateClientUsecase {
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
    @Inject(CLIENT_REALTIME)
    private readonly clientRealtime: ClientRealtime,
  ) {}

  async execute(input: UpdateClientInput): Promise<{ message: string }> {
    const txResult = await this.uow.runInTransaction(async (tx) => {
      const current = await this.clientRepo.findById(input.clientId, tx);
      if (!current) {
        throw new NotFoundException(new ClientNotFoundError().message);
      }

      if (!current.isActive) {
        throw new BadRequestException("No puedes actualizar un cliente deshabilitado");
      }

      const changedAt = this.clock.now();
      let changedFields: ClientWorkflowField[] = [];

      const wantsUbigeo =
        input.departmentId !== undefined ||
        input.provinceId !== undefined ||
        input.districtId !== undefined;

      if (
        wantsUbigeo &&
        (!input.departmentId || !input.provinceId || !input.districtId)
      ) {
        throw new BadRequestException("Debes enviar departmentId, provinceId y districtId");
      }

      let departmentId: UbigeoDepartmentId | undefined;
      let provinceId: UbigeoProvinceId | undefined;
      let districtId: UbigeoDistrictId | undefined;

      if (wantsUbigeo) {
        try {
          departmentId = new UbigeoDepartmentId(input.departmentId!);
          provinceId = new UbigeoProvinceId(input.provinceId!);
          districtId = new UbigeoDistrictId(input.districtId!);
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
      }

      try {
        const next = current.update({
          type: input.type,
          fullName: input.fullName,
          docType: input.docType,
          docNumber: input.docNumber,
          reference: input.reference,
          address: input.address,
          departmentId,
          provinceId,
          districtId,
          updatedAt: changedAt,
        });
        changedFields = this.resolveWorkflowChangedFields(current, next);

        const updated = await this.clientRepo.update(
          {
            clientId: next.clientId.value,
            type: next.type,
            fullName: next.fullName,
            docType: next.docType,
            docNumber: next.docNumber,
            reference: next.reference,
            address: next.address,
            departmentId: next.departmentId.value,
            provinceId: next.provinceId.value,
            districtId: next.districtId.value,
            updatedAt: next.updatedAt,
          },
          tx,
        );

        if (!updated) {
          throw new BadRequestException("No se pudo actualizar el cliente");
        }

        if (input.telephonesReplace !== undefined) {
          if (!Array.isArray(input.telephonesReplace)) {
            throw new BadRequestException("telephonesReplace debe ser un arreglo");
          }

          const phones = input.telephonesReplace;
          const requestedMains = phones.filter((p) => p.isMain === true);

          if (requestedMains.length > 1) {
            throw new BadRequestException("Solo un telefono puede ser principal");
          }

          await this.telephoneRepo.deleteByClientId(current.clientId.value, tx);

          for (const phone of phones) {
            if (!phone.number) {
              throw new BadRequestException("number es obligatorio para crear telefono");
            }

            const tel = ClientFactory.createTelephone({
              clientId: new ClientId(current.clientId.value),
              number: phone.number,
              isMain: phone.isMain ?? false,
            });

            await this.telephoneRepo.create(tel, tx);
          }
        }
      } catch (error) {
        if (error instanceof InvalidClientError) {
          throw new BadRequestException(error.message);
        }

        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException ||
          error instanceof ConflictException
        ) {
          throw error;
        }

        if ((error as any)?.code === "23505") {
          throw new ConflictException("Documento ya registrado");
        }

        throw new InternalServerErrorException("No se pudo actualizar el cliente");
      }

      return {
        message: "Cliente actualizado con exito",
        event: changedFields.length
          ? {
              clientId: current.clientId.value,
              changedFields,
              occurredAt: changedAt.toISOString(),
            }
          : null,
      };
    });

    if (txResult.event) {
      this.clientRealtime.emitClientUpdated(txResult.event);
    }

    return { message: txResult.message };
  }

  private resolveWorkflowChangedFields(before: Client, after: Client): ClientWorkflowField[] {
    const fields: Array<[ClientWorkflowField, string | null | undefined, string | null | undefined]> = [
      ["client.docNumber", before.docNumber, after.docNumber],
      ["client.address", before.address, after.address],
      ["client.reference", before.reference, after.reference],
      ["client.docType", before.docType, after.docType],
      ["client.departmentId", before.departmentId.value, after.departmentId.value],
      ["client.provinceId", before.provinceId.value, after.provinceId.value],
      ["client.districtId", before.districtId.value, after.districtId.value],
    ];

    return fields
      .filter(([, previous, next]) => (previous ?? "") !== (next ?? ""))
      .map(([field]) => field);
  }
}
