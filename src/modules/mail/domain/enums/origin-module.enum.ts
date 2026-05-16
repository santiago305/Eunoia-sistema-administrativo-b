export const ORIGIN_MODULE = {
  PURCHASES: 'purchases',
  PRODUCTION: 'production',
  WAREHOUSE: 'warehouse',
  CATALOG: 'catalog',
  SUPPLIES: 'supplies',
  SECURITY: 'security',
  ROLES: 'roles',
  PROVIDERS: 'providers',
  CORPORATE: 'corporate',
  SYSTEM: 'system',
} as const;

export type OriginModule = (typeof ORIGIN_MODULE)[keyof typeof ORIGIN_MODULE];

