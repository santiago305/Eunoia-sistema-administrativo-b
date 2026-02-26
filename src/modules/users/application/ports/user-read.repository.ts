export const USER_READ_REPOSITORY = Symbol('USER_READ_REPOSITORY');

export const USER_LIST_STATUSES = ['all', 'active', 'inactive'] as const;

export type UserListStatus = (typeof USER_LIST_STATUSES)[number];

export interface UserReadRepository {
  listUsers(params: {
    page?: number;
    filters?: { role?: string };
    sortBy?: string;
    order?: 'ASC' | 'DESC';
    status?: UserListStatus;
  }): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      telefono?: string;
      rol: string;
      roleId: string; 
      deleted: boolean;
      createdAt: Date;
    }>
  >;

  findPublicByEmail(email: string): Promise<{
    id: string;
    email: string;
    roleDescription: string;
  } | null>;

  findPublicById(id: string): Promise<{
    id: string;
    name: string;
    email: string;
    telefono?: string;
    deleted: boolean;
    avatarUrl?: string;
    createdAt?: Date;
    role: { id: string; description: string };
  } | null>;

  findWithPasswordByEmail(email: string): Promise<{
    id: string;
    email: string;
    password: string;
    roleDescription: string;
    failedLoginAttempts: number;
    lockoutLevel: number;
    lockedUntil: Date | null;
    securityDisabledAt: Date | null;
  } | null>;
}
