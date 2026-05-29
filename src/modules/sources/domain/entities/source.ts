import { randomUUID } from "crypto";
import { InvalidSourceError } from "../errors/invalid-source.error";
import { SourceDomainService } from "../services/source-domain.service";
import { SourceId } from "../value-objects/source-id.vo";

export class Source {
  private constructor(
    public readonly sourceId: SourceId,
    public readonly name: string,
    public readonly detail?: string,
    public readonly isActive: boolean = true,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(params: {
    sourceId?: SourceId;
    name: string;
    detail?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const name = params.name?.trim();
    if (!name) {
      throw new InvalidSourceError("El nombre es invalido");
    }

    return new Source(
      params.sourceId ?? new SourceId(randomUUID()),
      name,
      SourceDomainService.normalizeOptionalText(params.detail),
      params.isActive ?? true,
      params.createdAt,
      params.updatedAt,
    );
  }

  update(params: {
    name?: string;
    detail?: string;
    isActive?: boolean;
    updatedAt?: Date;
  }) {
    return Source.create({
      sourceId: this.sourceId,
      name: params.name ?? this.name,
      detail: params.detail ?? this.detail,
      isActive: params.isActive ?? this.isActive,
      createdAt: this.createdAt,
      updatedAt: params.updatedAt ?? this.updatedAt,
    });
  }
}

