import { Role } from '../entities/role.entity';

export class RoleFactory {

  static createNew(params: {
    description: string;
    createdByUserId?: string | null;
  }): Role {
    return new Role(
      undefined,             
      params.description,
      false,
      undefined,
      params.createdByUserId ?? null,
    );
  }
  static reconstitute(params: {
    id: string;
    description: string;
    deleted: boolean;
    createdAt?: Date;
    createdByUserId?: string | null;
  }): Role {
    return new Role(
      params.id,
      params.description,
      params.deleted,
      params.createdAt,
      params.createdByUserId ?? null,
    );
  }
}
