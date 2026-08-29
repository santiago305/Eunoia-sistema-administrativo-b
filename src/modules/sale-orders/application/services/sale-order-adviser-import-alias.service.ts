import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdviserEntity } from 'src/modules/advisers/adapters/out/persistence/typeorm/entities/adviser.entity';
import { normalizeTextForMatch } from 'src/modules/excel/application/orders-import/normalization';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { DataSource, Not, Repository } from 'typeorm';
import { SaleOrderAdviserImportAliasEntity } from '../../adapters/out/persistence/typeorm/entities/sale-order-adviser-import-alias.entity';

type SaveAliasInput = {
  externalName: string;
  adviserUserId: string;
  isActive?: boolean;
  replaceDeleted?: boolean;
  userId: string;
};

@Injectable()
export class SaleOrderAdviserImportAliasService {
  constructor(
    @InjectRepository(SaleOrderAdviserImportAliasEntity)
    private readonly repository: Repository<SaleOrderAdviserImportAliasEntity>,
    @InjectRepository(AdviserEntity)
    private readonly advisers: Repository<AdviserEntity>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async list(input: { page?: number; limit?: number; q?: string }) {
    const page = Math.max(1, Number(input.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(input.limit ?? 25)));
    const query = String(input.q ?? '').trim();

    const builder = this.repository
      .createQueryBuilder('alias')
      .leftJoinAndSelect('alias.adviser', 'adviser')
      .where('alias.isDeleted = false');

    if (query) {
      builder.andWhere(
        '(alias.externalName ILIKE :query OR adviser.name ILIKE :query OR adviser.email ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    const [items, total] = await builder
      .orderBy('alias.externalName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((item) => this.toOutput(item)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async create(input: SaveAliasInput) {
    await this.assertActiveAdviser(input.adviserUserId);
    const externalName = this.cleanExternalName(input.externalName);
    const normalizedName = this.normalizeExternalName(externalName);
    const existing = await this.repository.findOne({ where: { normalizedName } });

    if (existing && !existing.isDeleted) {
      throw new ConflictException(
        `El nombre ${externalName} ya está relacionado con un asesor`,
      );
    }

    if (existing) {
      existing.externalName = externalName;
      existing.adviserUserId = input.adviserUserId;
      existing.isActive = true;
      existing.isDeleted = false;
      existing.deletedAt = null;
      existing.updatedBy = input.userId;
      return this.toOutput(
        await this.repository.save(existing),
        await this.getActiveUser(input.adviserUserId),
      );
    }

    const saved = await this.repository.save(
      this.repository.create({
        externalName,
        normalizedName,
        adviserUserId: input.adviserUserId,
        isActive: true,
        isDeleted: false,
        createdBy: input.userId,
        updatedBy: input.userId,
        deletedAt: null,
      }),
    );

    return this.toOutput(saved, await this.getActiveUser(input.adviserUserId));
  }

  async update(id: string, input: SaveAliasInput) {
    const externalName = this.cleanExternalName(input.externalName);
    const normalizedName = this.normalizeExternalName(externalName);

    return this.dataSource.transaction(async (manager) => {
      await this.assertActiveAdviser(input.adviserUserId, manager.getRepository(AdviserEntity), manager.getRepository(User));
      const repository = manager.getRepository(SaleOrderAdviserImportAliasEntity);
      const current = await repository.findOne({
        where: { id, isDeleted: false },
      });
      if (!current) {
        throw new NotFoundException('Equivalencia de asesor no encontrada');
      }

      const conflicting = await repository.findOne({
        where: { normalizedName, id: Not(id) },
      });
      if (conflicting && !conflicting.isDeleted) {
        throw new ConflictException(
          `El nombre ${externalName} ya está relacionado con un asesor`,
        );
      }
      if (conflicting && !input.replaceDeleted) {
        throw new ConflictException({
          message: 'La equivalencia ya existe eliminada',
          details: {
            code: 'DELETED_ADVISER_IMPORT_ALIAS_CONFLICT',
            existingId: conflicting.id,
          },
        });
      }

      let saved: SaleOrderAdviserImportAliasEntity;
      if (conflicting) {
        conflicting.externalName = externalName;
        conflicting.adviserUserId = input.adviserUserId;
        conflicting.isActive = input.isActive ?? true;
        conflicting.isDeleted = false;
        conflicting.deletedAt = null;
        conflicting.updatedBy = input.userId;

        current.isActive = false;
        current.isDeleted = true;
        current.deletedAt = new Date();
        current.updatedBy = input.userId;
        await repository.save(current);
        saved = await repository.save(conflicting);
      } else {
        current.externalName = externalName;
        current.normalizedName = normalizedName;
        current.adviserUserId = input.adviserUserId;
        current.isActive = input.isActive ?? current.isActive;
        current.updatedBy = input.userId;
        saved = await repository.save(current);
      }

      const adviser = await manager.getRepository(User).findOne({
        where: { id: input.adviserUserId, deleted: false },
      });
      return this.toOutput(saved, adviser ?? undefined);
    });
  }

  async remove(id: string, userId: string) {
    const item = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    if (!item) {
      throw new NotFoundException('Equivalencia de asesor no encontrada');
    }

    item.isActive = false;
    item.isDeleted = true;
    item.deletedAt = new Date();
    item.updatedBy = userId;
    await this.repository.save(item);

    return { id, deleted: true };
  }

  private cleanExternalName(value: string) {
    const cleaned = String(value ?? '').trim().replace(/\s+/g, ' ');
    if (!cleaned) throw new ConflictException('El nombre externo es obligatorio');
    return cleaned;
  }

  private normalizeExternalName(value: string) {
    const normalized = normalizeTextForMatch(value);
    if (!normalized) throw new ConflictException('El nombre externo es obligatorio');
    return normalized;
  }

  private async assertActiveAdviser(
    adviserUserId: string,
    advisers = this.advisers,
    users = this.users,
  ) {
    const [isAdviser, user] = await Promise.all([
      advisers.exist({ where: { userId: adviserUserId } }),
      users.findOne({ where: { id: adviserUserId, deleted: false } }),
    ]);
    if (!isAdviser || !user) {
      throw new NotFoundException('Asesor activo no encontrado');
    }
  }

  private getActiveUser(userId: string) {
    return this.users.findOne({ where: { id: userId, deleted: false } });
  }

  private toOutput(
    item: SaleOrderAdviserImportAliasEntity,
    adviser = item.adviser,
  ) {
    return {
      id: item.id,
      externalName: item.externalName,
      adviserUserId: item.adviserUserId,
      adviser: adviser
        ? { id: adviser.id, name: adviser.name, email: adviser.email }
        : null,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
