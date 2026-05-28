import { ForbiddenException } from '@nestjs/common';
import { RoleType } from 'src/shared/constantes/constants';

export type RoleScopeContext = {
  requesterRole?: RoleType | null;
  requesterUserId: string;
  targetRoleDescription?: string | null;
  targetCreatedByUserId?: string | null;
  scope: {
    isSuperAdmin: boolean;
    roleDescription: string | null;
    manageableRoleDescriptions: string[] | null;
  } | null;
};

const normalize = (value?: string | null) => String(value ?? '').trim().toLowerCase();

export const resolveAllowedRoleDescriptions = (params: {
  requesterRole?: RoleType | null;
  scope: {
    roleDescription: string | null;
    manageableRoleDescriptions: string[] | null;
  } | null;
}) => {
  const configuredAllowedRoles = Array.isArray(params.scope?.manageableRoleDescriptions)
    ? params.scope.manageableRoleDescriptions.map((value) => normalize(value)).filter(Boolean)
    : [];

  if (configuredAllowedRoles.length > 0) {
    return Array.from(new Set(configuredAllowedRoles));
  }

  const fallbackAllowedRoles = [params.scope?.roleDescription, params.requesterRole]
    .map((value) => normalize(value))
    .filter(Boolean);
  return Array.from(new Set(fallbackAllowedRoles));
};

export const assertCanManageRoleByScope = (params: RoleScopeContext) => {
  if (params.scope?.isSuperAdmin) return;

  if (!params.scope) {
    throw new ForbiddenException('No se pudo resolver el alcance del usuario solicitante');
  }

  if (params.targetCreatedByUserId && params.targetCreatedByUserId === params.requesterUserId) {
    return;
  }

  const targetRoleDescription = normalize(params.targetRoleDescription);
  if (!targetRoleDescription) {
    throw new ForbiddenException('No tienes alcance para gestionar este rol');
  }

  const allowedRoles = resolveAllowedRoleDescriptions({
    requesterRole: params.requesterRole,
    scope: params.scope,
  });

  if (!allowedRoles.includes(targetRoleDescription)) {
    throw new ForbiddenException('No tienes alcance para gestionar este rol');
  }
};
