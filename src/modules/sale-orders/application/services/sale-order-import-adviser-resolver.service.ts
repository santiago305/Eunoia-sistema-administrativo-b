import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AdviserEntity } from "src/modules/advisers/adapters/out/persistence/typeorm/entities/adviser.entity";
import { normalizeTextForMatch } from "src/modules/excel/application/orders-import/normalization";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Repository } from "typeorm";

@Injectable()
export class SaleOrderImportAdviserResolverService {
  constructor(
    @InjectRepository(AdviserEntity)
    private readonly advisers: Repository<AdviserEntity>,
  ) {}

  async resolveByName(value: string | null | undefined, tx?: TransactionContext): Promise<string | null> {
    const text = String(value ?? "").trim();
    if (!text) return null;

    if (this.isUuid(text)) {
      const advisers = this.getAdviserRepository(tx);
      return (await advisers.exist({ where: { userId: text } })) ? text : null;
    }

    const normalizedName = normalizeTextForMatch(text);
    if (!normalizedName) return null;

    const advisers = this.getAdviserRepository(tx);
    const rows = await advisers
      .createQueryBuilder("adviser")
      .innerJoin(User, "user", `"user"."user_id" = "adviser"."user_id"`)
      .where(`"user"."deleted" = false`)
      .select([
        `"adviser"."user_id" as "id"`,
        `"user"."name" as "name"`,
      ])
      .orderBy(`"user"."name"`, "ASC")
      .addOrderBy(`"adviser"."user_id"`, "ASC")
      .getRawMany<{ id: string; name: string }>();

    const match = rows.find((row) => normalizeTextForMatch(row.name) === normalizedName);
    return match?.id ?? null;
  }

  private getAdviserRepository(tx?: TransactionContext): Repository<AdviserEntity> {
    const manager = (tx as { manager?: { getRepository: <T>(entity: unknown) => Repository<T> } } | undefined)
      ?.manager;
    return manager?.getRepository<AdviserEntity>(AdviserEntity) ?? this.advisers;
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
