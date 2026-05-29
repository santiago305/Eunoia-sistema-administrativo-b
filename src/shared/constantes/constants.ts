export enum RoleType {
  SUPER_ADMINISTRATOR = 'super_administrator',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  ADVISER = 'adviser',
  PURCHASING_MANAGER = 'purchasing_manager',
}

export const MASTER_ROLE_DESCRIPTION = RoleType.SUPER_ADMINISTRATOR;

export enum status {
  ERROR = 'error',
  SUCCESS = 'success',
  WARNING = 'warning',
  INFO = 'info',
  UNAUTHORIZED = 'unauthorized',
  INVALID = 'invalid',
}
