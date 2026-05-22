import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Telephone } from "../entities/telephone";

export const TELEPHONE_REPOSITORY = Symbol("TELEPHONE_REPOSITORY");

export interface TelephoneRepository {
  findById(telephoneId: string, tx?: TransactionContext): Promise<Telephone | null>;
  listByClientId(clientId: string, tx?: TransactionContext): Promise<Telephone[]>;
  create(telephone: Telephone, tx?: TransactionContext): Promise<Telephone>;
  update(
    params: {
      telephoneId: string;
      number?: string;
      isMain?: boolean;
    },
    tx?: TransactionContext,
  ): Promise<Telephone | null>;
  unsetMainByClientId(clientId: string, tx?: TransactionContext): Promise<void>;
  setMain(telephoneId: string, tx?: TransactionContext): Promise<void>;
  deleteByClientId(clientId: string, tx?: TransactionContext): Promise<void>;
}
