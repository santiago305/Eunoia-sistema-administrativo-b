export const USER_READ_REPOSITORY = Symbol('USER_READ_REPOSITORY');

export const USER_LIST_STATUSES = ['all', 'active', 'inactive'] as const;

export type UserListStatus = (typeof USER_LIST_STATUSES)[number];

export interface UserReadRepository {
  listUsers(params: {
    page?: number;
    filters?: {
      role?: string;
      q?: string;
      allowedRoles?: string[];
      allowedUserIds?: string[];
    };
    sortBy?: string;
    order?: 'ASC' | 'DESC';
    status?: UserListStatus;
  }): Promise<{
    items: Array<{
      id: string;
      name: string;
      email: string;
      telefono?: string;
      rol: string | null;
      roleId: string | null;
      deleted: boolean;
      createdAt: Date;
      updatedAt?: Date;
      createdByUserId?: string | null;
      createdByUserName?: string | null;
      manageableRoleDescriptions?: string[] | null;
      manageableUserIds?: string[] | null;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>;

  countUsersByRole(params: {
    filters?: {
      role?: string;
      q?: string;
      allowedRoles?: string[];
      allowedUserIds?: string[];
    };
    status?: UserListStatus;
  }): Promise<{
    total: number;
    byRole: Record<string, number>;
  }>;

  findPublicByEmail(email: string): Promise<{
    id: string;
    email: string;
    roleDescription: string | null;
  } | null>;

  findManagementByEmail(email: string): Promise<{
    id: string;
    email: string;
    roleDescription: string | null;
    deleted: boolean;
  } | null>;

  findPublicById(id: string): Promise<{
    id: string;
    name: string;
    email: string;
    telefono?: string;
    deleted: boolean;
    avatarUrl?: string;
    createdAt?: Date;
    role: { id: string; description: string } | null;
  } | null>;

  findManagementById(id: string): Promise<{
    id: string;
    name: string;
    email: string;
    telefono?: string;
    deleted: boolean;
    avatarUrl?: string;
    createdAt?: Date;
    role: { id: string; description: string } | null;
    isSuperAdmin?: boolean;
    manageableRoleDescriptions?: string[] | null;
    manageableUserIds?: string[] | null;
  } | null>;

  findManagementScopeById(id: string): Promise<{
    id: string;
    roleDescription: string | null;
    isSuperAdmin: boolean;
    manageableRoleDescriptions: string[] | null;
    manageableUserIds: string[] | null;
  } | null>;

  findWithPasswordByEmail(email: string): Promise<{
    id: string;
    email: string;
    password: string;
    roleDescription: string | null;
    isSuperAdmin: boolean;
    failedLoginAttempts: number;
    lockoutLevel: number;
    lockedUntil: Date | null;
    securityDisabledAt: Date | null;
  } | null>;
}
