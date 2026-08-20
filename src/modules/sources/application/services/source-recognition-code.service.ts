import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, ILike, Not, Repository } from "typeorm";
import { SourceRecognitionCodeEntity } from "../../adapters/out/persistence/typeorm/entities/source-recognition-code.entity";
import { SourceEntity } from "../../adapters/out/persistence/typeorm/entities/source.entity";
import {
  matchSourceRecognitionCode,
  normalizeSourceRecognitionCode,
  SourceRecognitionMatch,
} from "../support/source-recognition-parser";

type SaveRecognitionCodeInput = {
  sourceId: string;
  code: string;
  description?: string | null;
  isActive?: boolean;
  replaceDeleted?: boolean;
  userId: string;
};

@Injectable()
export class SourceRecognitionCodeService {
  constructor(
    @InjectRepository(SourceRecognitionCodeEntity)
    private readonly repository: Repository<SourceRecognitionCodeEntity>,
    @InjectRepository(SourceEntity)
    private readonly sourceRepository: Repository<SourceEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async list(input: { sourceId: string; page?: number; limit?: number; q?: string }) {
    await this.assertSourceExists(input.sourceId);
    const page = Math.max(1, Number(input.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(input.limit ?? 25)));
    const q = String(input.q ?? "").trim();

    const [items, total] = await this.repository.findAndCount({
      where: q
        ? [
            { sourceId: input.sourceId, isDeleted: false, code: ILike(`%${q}%`) },
            { sourceId: input.sourceId, isDeleted: false, description: ILike(`%${q}%`) },
          ]
        : { sourceId: input.sourceId, isDeleted: false },
      order: { code: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async recognize(note: unknown): Promise<SourceRecognitionMatch | null> {
    const rows = await this.repository.find({
      where: {
        isActive: true,
        isDeleted: false,
        source: { isActive: true },
      },
      relations: { source: true },
      order: { code: "ASC" },
    });

    return matchSourceRecognitionCode(
      note,
      rows.map((row) => ({
        sourceId: row.sourceId,
        sourceName: row.source.name,
        code: row.code,
      })),
    );
  }

  async create(input: SaveRecognitionCodeInput) {
    await this.assertSourceExists(input.sourceId);
    const code = this.normalizeCode(input.code);
    const existing = await this.repository.findOne({ where: { code } });

    if (existing && !existing.isDeleted) {
      throw new ConflictException(`El código ${code} ya pertenece a un enganche`);
    }

    if (existing) {
      existing.sourceId = input.sourceId;
      existing.description = this.normalizeDescription(input.description);
      existing.isActive = true;
      existing.isDeleted = false;
      existing.deletedAt = null;
      existing.updatedBy = input.userId;
      return this.repository.save(existing);
    }

    return this.repository.save(
      this.repository.create({
        sourceId: input.sourceId,
        code,
        description: this.normalizeDescription(input.description),
        isActive: true,
        isDeleted: false,
        createdBy: input.userId,
        updatedBy: input.userId,
        deletedAt: null,
      }),
    );
  }

  async update(id: string, input: SaveRecognitionCodeInput) {
    const code = this.normalizeCode(input.code);

    return this.dataSource.transaction(async (manager) => {
      const sourceRepository = manager.getRepository(SourceEntity);
      const source = await sourceRepository.findOne({ where: { id: input.sourceId } });
      if (!source) throw new NotFoundException("Enganche no encontrado");

      const repository = manager.getRepository(SourceRecognitionCodeEntity);
      const current = await repository.findOne({
        where: { id, sourceId: input.sourceId, isDeleted: false },
      });
      if (!current) throw new NotFoundException("Código de reconocimiento no encontrado");

      const conflicting = await repository.findOne({ where: { code, id: Not(id) } });

      if (conflicting && !conflicting.isDeleted) {
        throw new ConflictException(`El código ${code} ya pertenece a un enganche`);
      }

      if (conflicting && !input.replaceDeleted) {
        throw new ConflictException({
          message: "El código ya existe eliminado",
          details: {
            code: "DELETED_RECOGNITION_CODE_CONFLICT",
            existingId: conflicting.id,
          },
        });
      }

      if (conflicting) {
        conflicting.sourceId = input.sourceId;
        conflicting.description = this.normalizeDescription(input.description);
        conflicting.isActive = input.isActive ?? true;
        conflicting.isDeleted = false;
        conflicting.deletedAt = null;
        conflicting.updatedBy = input.userId;

        current.isActive = false;
        current.isDeleted = true;
        current.deletedAt = new Date();
        current.updatedBy = input.userId;

        await repository.save(current);
        return repository.save(conflicting);
      }

      current.code = code;
      current.description = this.normalizeDescription(input.description);
      current.isActive = input.isActive ?? current.isActive;
      current.updatedBy = input.userId;
      return repository.save(current);
    });
  }

  async remove(sourceId: string, id: string, userId: string) {
    const item = await this.repository.findOne({
      where: { id, sourceId, isDeleted: false },
    });
    if (!item) throw new NotFoundException("Código de reconocimiento no encontrado");

    item.isActive = false;
    item.isDeleted = true;
    item.deletedAt = new Date();
    item.updatedBy = userId;
    await this.repository.save(item);

    return { id, deleted: true };
  }

  private normalizeCode(value: string) {
    return normalizeSourceRecognitionCode(value);
  }

  private normalizeDescription(value: string | null | undefined) {
    const description = String(value ?? "").trim();
    return description || null;
  }

  private async assertSourceExists(sourceId: string) {
    const source = await this.sourceRepository.findOne({ where: { id: sourceId } });
    if (!source) throw new NotFoundException("Enganche no encontrado");
  }
}
