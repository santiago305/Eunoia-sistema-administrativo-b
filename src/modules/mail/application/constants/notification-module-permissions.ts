export const NOTIFICATION_MODULE_PERMISSIONS: Record<string, string[]> = {
  purchases: ['purchases.view'],
  production: ['production.read'],
  warehouse: ['warehouses.read'],
  catalog: ['catalog.read'],
  supplies: ['suppliers.read'],
  security: ['security.read'],
  roles: ['roles.read'],
  providers: ['suppliers.read'],
  corporate: ['page.notifications.view'],
  system: ['page.notifications.view'],
};

export const NOTIFICATION_MODULE_LABELS: Record<string, string> = {
  purchases: 'Compras',
  production: 'Produccion',
  warehouse: 'Almacen',
  catalog: 'Catalogo',
  supplies: 'Suministros',
  security: 'Seguridad',
  roles: 'Roles',
  providers: 'Proveedores',
  corporate: 'Corporativo',
  system: 'Sistema',
};

export const NOTIFICATION_MODULE_ICONS: Record<string, string> = {
  purchases: 'ShoppingCart',
  production: 'Factory',
  warehouse: 'Warehouse',
  catalog: 'PackageSearch',
  supplies: 'Boxes',
  security: 'Shield',
  roles: 'KeyRound',
  providers: 'Truck',
  corporate: 'Mail',
  system: 'Bell',
};
