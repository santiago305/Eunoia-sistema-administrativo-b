type PermissionSeedItem = {
  code: string;
  name: string;
  description: string;
  module: string;
  resource: string;
  action: string;
  type: 'action' | 'page';
};

export const PERMISSIONS_SEED: PermissionSeedItem[] = [
  { code: 'page.dashboard.view', name: 'Ver dashboard', description: 'Acceso a la vista principal', module: 'dashboard', resource: 'dashboard', action: 'view', type: 'page' },
  { code: 'page.users.view', name: 'Ver usuarios', description: 'Acceso a pantalla de usuarios', module: 'users', resource: 'users', action: 'view', type: 'page' },
  { code: 'page.roles.view', name: 'Ver roles', description: 'Acceso a pantalla de roles', module: 'roles', resource: 'roles', action: 'view', type: 'page' },
  { code: 'page.purchases.view', name: 'Ver compras', description: 'Acceso a pantalla de compras', module: 'purchases', resource: 'purchases', action: 'view', type: 'page' },
  { code: 'page.notifications.view', name: 'Ver notificaciones', description: 'Acceso a pantalla de notificaciones', module: 'notifications', resource: 'notifications', action: 'view', type: 'page' },
  { code: 'users.read', name: 'Listar usuarios', description: 'Ver listado de usuarios', module: 'users', resource: 'users', action: 'read', type: 'action' },
  { code: 'users.create', name: 'Crear usuarios', description: 'Crear nuevos usuarios', module: 'users', resource: 'users', action: 'create', type: 'action' },
  { code: 'users.update', name: 'Editar usuarios', description: 'Actualizar perfil de usuarios', module: 'users', resource: 'users', action: 'update', type: 'action' },
  { code: 'users.delete', name: 'Eliminar usuarios', description: 'Desactivar usuarios', module: 'users', resource: 'users', action: 'delete', type: 'action' },
  { code: 'users.restore', name: 'Restaurar usuarios', description: 'Restaurar usuarios desactivados', module: 'users', resource: 'users', action: 'restore', type: 'action' },
  { code: 'users.assign_roles', name: 'Asignar roles', description: 'Cambiar rol de usuarios', module: 'users', resource: 'users', action: 'assign_roles', type: 'action' },
  { code: 'users.assign_permissions', name: 'Asignar permisos', description: 'Asignar permisos directos por usuario', module: 'users', resource: 'users', action: 'assign_permissions', type: 'action' },
  { code: 'users.deny_permissions', name: 'Denegar permisos', description: 'Denegar permisos directos por usuario', module: 'users', resource: 'users', action: 'deny_permissions', type: 'action' },
  { code: 'users.view_effective_permissions', name: 'Ver permisos efectivos', description: 'Consultar permisos efectivos de usuario', module: 'users', resource: 'users', action: 'view_effective_permissions', type: 'action' },
  { code: 'roles.read', name: 'Listar roles', description: 'Ver listado de roles', module: 'roles', resource: 'roles', action: 'read', type: 'action' },
  { code: 'roles.create', name: 'Crear roles', description: 'Crear nuevos roles', module: 'roles', resource: 'roles', action: 'create', type: 'action' },
  { code: 'roles.update', name: 'Editar roles', description: 'Editar roles existentes', module: 'roles', resource: 'roles', action: 'update', type: 'action' },
  { code: 'roles.delete', name: 'Eliminar roles', description: 'Eliminar roles', module: 'roles', resource: 'roles', action: 'delete', type: 'action' },
  { code: 'roles.assign_permissions', name: 'Asignar permisos a rol', description: 'Asignar permisos base a un rol', module: 'roles', resource: 'roles', action: 'assign_permissions', type: 'action' },
  { code: 'permissions.read', name: 'Listar permisos', description: 'Consultar catalogo de permisos', module: 'permissions', resource: 'permissions', action: 'read', type: 'action' },
  { code: 'purchases.read', name: 'Listar compras', description: 'Ver compras', module: 'purchases', resource: 'purchases', action: 'read', type: 'action' },
  { code: 'purchases.process.request', name: 'Solicitar procesamiento de compra', description: 'Solicitar aprobacion de procesamiento', module: 'purchases', resource: 'purchases', action: 'process.request', type: 'action' },
  { code: 'purchases.approve', name: 'Aprobar compra', description: 'Aprobar procesamiento de compra', module: 'purchases', resource: 'purchases', action: 'approve', type: 'action' },
  { code: 'notifications.read', name: 'Listar notificaciones', description: 'Consultar notificaciones', module: 'notifications', resource: 'notifications', action: 'read', type: 'action' },
];

export const ROLE_PERMISSION_SEED: Record<string, string[]> = {
  admin: ['*'],
  moderator: [
    'page.dashboard.view',
    'page.users.view',
    'page.purchases.view',
    'page.notifications.view',
    'users.read',
    'users.create',
    'users.update',
    'users.delete',
    'users.restore',
    'users.assign_roles',
    'users.view_effective_permissions',
    'purchases.read',
    'purchases.process.request',
    'notifications.read',
  ],
  adviser: [
    'page.dashboard.view',
    'page.purchases.view',
    'page.notifications.view',
    'purchases.read',
    'purchases.process.request',
    'notifications.read',
  ],
};

