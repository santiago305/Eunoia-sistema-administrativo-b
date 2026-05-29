import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Source } from "../entities/source";
import { SourceSearchRule } from "src/modules/sources/application/dtos/source-search/source-search-snapshot";

export const SOURCE_REPOSITORY = Symbol("SOURCE_REPOSITORY");

export interface SourceRepository {
  findById(sourceId: string, tx?: TransactionContext): Promise<Source | null>;
  create(source: Source, tx?: TransactionContext): Promise<Source>;
  update(
    params: {
      sourceId: string;
      name?: string;
      detail?: string;
      isActive?: boolean;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<Source | null>;
  setActive(sourceId: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
  list(
    params: {
      q?: string;
      isActive?: boolean;
      filters?: SourceSearchRule[];
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: Source[]; total: number }>;
}

