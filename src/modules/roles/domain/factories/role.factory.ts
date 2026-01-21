import { Role } from '../entities/role.entity';

export class RoleFactory {

  static createNew(params: {
    description: string;
  }): Role {
    return new Role(
      undefined,             
      params.description,
      false                   
    );
  }
  static reconstitute(params: {
    id: string;
    description: string;
    deleted: boolean;
    createdAt?: Date;
  }): Role {
    return new Role(
      params.id,
      params.description,
      params.deleted,
      params.createdAt
    );
  }
}
