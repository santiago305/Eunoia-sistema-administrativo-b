import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AdviserEntity } from "src/modules/advisers/adapters/out/persistence/typeorm/entities/adviser.entity";
import { normalizeTextForMatch } from "src/modules/excel/application/orders-import/normalization";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Repository } from "typeorm";
import { SaleOrderAdviserImportAliasEntity } from "../../adapters/out/persistence/typeorm/entities/sale-order-adviser-import-alias.entity";

export type SaleOrderImportAdviserResolution = {
  value: string;
  status: "EMPTY" | "UUID" | "ALIAS" | "NAME" | "NOT_FOUND";
  adviser: { id: string; name: string; email: string } | null;
};

@Injectable()
export class SaleOrderImportAdviserResolverService {
  constructor(
    @InjectRepository(AdviserEntity)
    private readonly advisers: Repository<AdviserEntity>,
    @InjectRepository(SaleOrderAdviserImportAliasEntity)
    private readonly aliases: Repository<SaleOrderAdviserImportAliasEntity>,
  ) {}

  async resolveByName(value: string | null | undefined, tx?: TransactionContext): Promise<string | null> {
    return (await this.resolve(value, tx)).adviser?.id ?? null;
  }

  async resolveMany(
    values: Array<string | null | undefined>,
    tx?: TransactionContext,
  ): Promise<SaleOrderImportAdviserResolution[]> {
    return Promise.all(values.map((value) => this.resolve(value, tx)));
  }

  async resolve(
    value: string | null | undefined,
    tx?: TransactionContext,
  ): Promise<SaleOrderImportAdviserResolution> {
    const text = String(value ?? "").trim();
    if (!text) return { value: text, status: "EMPTY", adviser: null };

    if (this.isUuid(text)) {
      const advisers = this.getAdviserRepository(tx);
      const row = await this.findActiveAdviserById(advisers, text);
      return {
        value: text,
        status: row ? "UUID" : "NOT_FOUND",
        adviser: row,
      };
    }

    const normalizedName = normalizeTextForMatch(text);
    if (!normalizedName) return { value: text, status: "EMPTY", adviser: null };

    const alias = await this.getAliasRepository(tx).findOne({
      where: {
        normalizedName,
        isActive: true,
        isDeleted: false,
        adviser: { deleted: false },
      },
      relations: { adviser: true },
    });
    if (alias?.adviser) {
      return {
        value: text,
        status: "ALIAS",
        adviser: {
          id: alias.adviser.id,
          name: alias.adviser.name,
          email: alias.adviser.email,
        },
      };
    }

    const advisers = this.getAdviserRepository(tx);
    const rows = await advisers
      .createQueryBuilder("adviser")
      .innerJoin(User, "user", `"user"."user_id" = "adviser"."user_id"`)
      .where(`"user"."deleted" = false`)
      .select([
        `"adviser"."user_id" as "id"`,
        `"user"."name" as "name"`,
        `"user"."email" as "email"`,
      ])
      .orderBy(`"user"."name"`, "ASC")
      .addOrderBy(`"adviser"."user_id"`, "ASC")
      .getRawMany<{ id: string; name: string; email: string }>();

    const match = rows.find((row) => normalizeTextForMatch(row.name) === normalizedName);
    return {
      value: text,
      status: match ? "NAME" : "NOT_FOUND",
      adviser: match ?? null,
    };
  }

  private getAdviserRepository(tx?: TransactionContext): Repository<AdviserEntity> {
    const manager = (tx as { manager?: { getRepository: <T>(entity: unknown) => Repository<T> } } | undefined)
      ?.manager;
    return manager?.getRepository<AdviserEntity>(AdviserEntity) ?? this.advisers;
  }

  private getAliasRepository(
    tx?: TransactionContext,
  ): Repository<SaleOrderAdviserImportAliasEntity> {
    const manager = (tx as { manager?: { getRepository: <T>(entity: unknown) => Repository<T> } } | undefined)
      ?.manager;
    return manager?.getRepository<SaleOrderAdviserImportAliasEntity>(
      SaleOrderAdviserImportAliasEntity,
    ) ?? this.aliases;
  }

  private async findActiveAdviserById(
    advisers: Repository<AdviserEntity>,
    userId: string,
  ) {
    const row = await advisers
      .createQueryBuilder("adviser")
      .innerJoin(User, "user", `"user"."user_id" = "adviser"."user_id"`)
      .where(`"adviser"."user_id" = :userId`, { userId })
      .andWhere(`"user"."deleted" = false`)
      .select([
        `"adviser"."user_id" as "id"`,
        `"user"."name" as "name"`,
        `"user"."email" as "email"`,
      ])
      .getRawOne<{ id: string; name: string; email: string }>();
    return row ?? null;
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
