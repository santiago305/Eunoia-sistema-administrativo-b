export const ROLE_READ_REPOSITORY = Symbol('ROLE_READ_REPOSITORY');

export const ROLE_LIST_STATUSES = ['all', 'active', 'inactive'] as const;

export type RoleListStatus = (typeof ROLE_LIST_STATUSES)[number];

export interface RoleReadRepository {
  listRoles(params?: {
    status?: RoleListStatus;
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
