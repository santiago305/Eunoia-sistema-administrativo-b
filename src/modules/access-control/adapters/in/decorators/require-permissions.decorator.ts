import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSION_GROUPS_KEY = 'permission_groups';
export const DYNAMIC_PERMISSION_GROUPS_KEY = 'dynamic_permission_groups';

export type PermissionGroup = string[];
export type PermissionGroupsResolver = (request: {
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
}) => PermissionGroup[];

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireAnyPermissionGroups = (...groups: PermissionGroup[]) =>
  SetMetadata(PERMISSION_GROUPS_KEY, groups);

export const RequireDynamicPermissionGroups = (resolver: PermissionGroupsResolver) =>
  SetMetadata(DYNAMIC_PERMISSION_GROUPS_KEY, resolver);

