import { Role } from '../../domain/entities/role.entity';

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export interface RoleRepository {
  save(role: Role): Promise<Role>;
  findById(id: string): Promise<Role | null>;
  updateDeleted(id: string, deleted: boolean): Promise<void>;
  update(role: Role): Promise<Role>;
}
