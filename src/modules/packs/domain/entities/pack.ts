import { randomUUID } from "crypto";
import { InvalidPackError } from "../errors/invalid-pack.error";
import { PackId } from "../value-objects/pack-id.vo";

export class Pack {
  private constructor(
    public readonly packId: PackId,
    public readonly description: string,
    public readonly total: number,
    public readonly isActive: boolean,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(params: {
    packId?: PackId;
    description: string;
    total: number;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const description = params.description?.trim();
    if (!description) {
      throw new InvalidPackError("Descripcion invalida");
    }
    if (params.total < 0) {
      throw new InvalidPackError("Total invalido");
    }

    return new Pack(
      params.packId ?? new PackId(randomUUID()),
      description,
      params.total,
      params.isActive ?? true,
      params.createdAt,
      params.updatedAt,
    );
  }
}

