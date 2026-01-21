export const ROLE_READ_REPOSITORY = Symbol('ROLE_READ_REPOSITORY');

export interface RoleReadRepository {
  listRoles(params?: {
    includeDeleted?: boolean;
  }): Promise<
    Array<{
      id: string;
      description: string;
      deleted: boolean;
      createdAt: Date;
    }>
  >;

  findById(id: string): Promise<{
    id: string;
    description: string;
    deleted: boolean;
    createdAt: Date;
  } | null>;

  findByDescription(description: string): Promise<{
    id: string;
    description: string;
    deleted: boolean;
    createdAt: Date;
  } | null>;
  
  existsByDescription(description: string): Promise<boolean>;
}
