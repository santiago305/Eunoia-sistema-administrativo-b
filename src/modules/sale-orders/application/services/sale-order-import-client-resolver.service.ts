import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CreateClientUsecase } from "src/modules/clients/application/usecases/client/create.usecase";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from "src/modules/clients/domain/ports/client.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { NormalizedSaleOrderImportPreviewRow } from "./sale-order-import-row-normalizer.service";

@Injectable()
export class SaleOrderImportClientResolverService {
  constructor(
    private readonly createClientUsecase: CreateClientUsecase,
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
  ) {}

  async resolveOrCreate(row: NormalizedSaleOrderImportPreviewRow, tx: TransactionContext): Promise<string> {
    const reference = row.parsedDocument?.reference?.trim() || undefined;

    if (row.clientResolution.clientId) {
      const changes: {
        clientId: string;
        type?: ClientType;
        reference?: string;
      } = { clientId: row.clientResolution.clientId };

      if (row.clientType !== ClientType.UNDEFINED) changes.type = row.clientType;
      if (reference) changes.reference = reference;

      if (changes.type !== undefined || changes.reference !== undefined) {
        await this.clientRepo.update(changes, tx);
      }
      return row.clientResolution.clientId;
    }
    if (!row.ubigeo) throw new BadRequestException("No se puede crear cliente sin ubigeo");

    const clientId = await this.createClientUsecase.executeInTransaction(
      {
        type: row.clientType as ClientType,
        fullName: row.recipientName,
        docType: row.parsedDocument.docType,
        docNumber: row.parsedDocument.docNumber,
        reference,
        address: row.address ?? undefined,
        departmentId: row.ubigeo.departmentId,
        provinceId: row.ubigeo.provinceId,
        districtId: row.ubigeo.districtId,
        isActive: true,
        telephonesReplace: [{ number: row.normalizedPhone, isMain: true }],
      },
      tx,
    );

    return clientId;
  }

}

