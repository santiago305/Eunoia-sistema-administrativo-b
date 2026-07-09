import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CreateClientUsecase } from "src/modules/clients/application/usecases/client/create.usecase";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
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
    if (row.clientResolution.clientId) {
      if (row.clientType !== ClientType.UNDEFINED) {
        await this.clientRepo.update(
          { clientId: row.clientResolution.clientId, type: row.clientType },
          tx,
        );
      }
      return row.clientResolution.clientId;
    }
    if (!row.ubigeo) throw new BadRequestException("No se puede crear cliente sin ubigeo");

    const clientReference = this.buildClientReference(row);

    const clientId = await this.createClientUsecase.executeInTransaction(
      {
        type: row.clientType as ClientType,
        fullName: row.recipientName,
        docType: row.parsedDocument.docType,
        docNumber: row.parsedDocument.docNumber,
        reference: clientReference,
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

  private buildClientReference(row: NormalizedSaleOrderImportPreviewRow): string | undefined {
    if (row.parsedDocument.docType !== ClientDocType.NONE) return undefined;

    const sanitized = this.sanitizeReference(row.parsedDocument.reference);
    if (sanitized) return sanitized;

    return undefined;
  }

  private sanitizeReference(value: string | null | undefined): string | undefined {
    const text = String(value ?? "").trim();
    if (!text) return undefined;

    const cleaned = text
      .replace(/[^a-zA-Z0-9\s\-_.]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return text.slice(0, 80);
    return cleaned.slice(0, 80);
  }
}

