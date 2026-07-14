import { randomUUID } from "crypto";
import { InvalidAgencyError } from "../errors/invalid-agency.error";
import { AgencyId } from "../value-objects/agency-id.vo";

export class Agency {
  private constructor(
    public readonly agencyId: AgencyId,
    public readonly name: string,
    public readonly isActive: boolean = true,
    public readonly description: string | null = null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(params: {
    agencyId?: AgencyId;
    name: string;
    isActive?: boolean;
    description?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const name = params.name?.trim();
    if (!name) {
      throw new InvalidAgencyError("El nombre es invalido");
    }

    const description = params.description?.trim() || null;

    return new Agency(
      params.agencyId ?? new AgencyId(randomUUID()),
      name,
      params.isActive ?? true,
      description,
      params.createdAt,
      params.updatedAt,
    );
  }

  update(params: {
    name?: string;
    isActive?: boolean;
    description?: string | null;
    updatedAt?: Date;
  }) {
    return Agency.create({
      agencyId: this.agencyId,
      name: params.name ?? this.name,
      isActive: params.isActive ?? this.isActive,
      description: params.description === undefined ? this.description : params.description,
      createdAt: this.createdAt,
      updatedAt: params.updatedAt ?? this.updatedAt,
    });
  }
}

