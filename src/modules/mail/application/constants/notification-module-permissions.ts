export const NOTIFICATION_MODULE_PERMISSIONS: Record<string, string[]> = {
  purchases: ['purchases.view'],
  production: ['production.read'],
  warehouse: ['warehouses.read'],
  catalog: ['catalog.read'],
  supplies: ['suppliers.read'],
  security: ['security.read'],
  roles: ['roles.read'],
  providers: ['suppliers.read'],
  'recurring-purchases': ['recurring_purchases.receive_due_notifications'],
  corporate: ['page.notifications.view'],
  system: ['page.notifications.view'],
};

export const NOTIFICATION_MODULE_LABELS: Record<string, string> = {
  purchases: 'Compras',
  production: 'Producción',
  warehouse: 'Almacenes',
  catalog: 'Catálogo',
  supplies: 'Suministros',
  security: 'Seguridad',
  roles: 'Roles',
  providers: 'Proveedores',
  'recurring-purchases': 'Compras recurrentes',
  corporate: 'Sistema',
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
  'recurring-purchases': 'CalendarClock',
  corporate: 'Mail',
  system: 'Bell',
};
