import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Client } from "../entities/client";
import { ClientDocType } from "../object-values/client-doc-type";
import { ClientType } from "../object-values/client-type";
import { ClientSearchRule } from "src/modules/clients/application/dtos/client-search/client-search-snapshot";

export const CLIENT_REPOSITORY = Symbol("CLIENT_REPOSITORY");

export interface ClientRepository {
  findById(clientId: string, tx?: TransactionContext): Promise<Client | null>;
  findByDocument(
    docType: ClientDocType,
    docNumber: string,
    tx?: TransactionContext,
  ): Promise<Client | null>;
  findByReference(reference: string, tx?: TransactionContext): Promise<Client | null>;
  create(client: Client, tx?: TransactionContext): Promise<Client>;
  update(
    params: {
      clientId: string;
      type?: ClientType;
      fullName?: string;
      docType?: ClientDocType;
      docNumber?: string;
      departmentId?: string;
      provinceId?: string;
      districtId?: string;
      reference?: string;
      address?: string;
      isActive?: boolean;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<Client | null>;
  setActive(clientId: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
  list(
    params: {
      q?: string;
      isActive?: boolean;
      filters?: ClientSearchRule[];
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: Client[]; total: number }>;
}
