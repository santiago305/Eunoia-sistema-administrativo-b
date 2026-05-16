import { ORIGIN_MODULE, type OriginModule } from '../enums/origin-module.enum';

const ORIGIN_MODULE_ALIASES: Record<string, OriginModule> = {
  purchase: ORIGIN_MODULE.PURCHASES,
  compras: ORIGIN_MODULE.PURCHASES,
  produccion: ORIGIN_MODULE.PRODUCTION,
  production: ORIGIN_MODULE.PRODUCTION,
  almacen: ORIGIN_MODULE.WAREHOUSE,
  warehouse: ORIGIN_MODULE.WAREHOUSE,
  catalogo: ORIGIN_MODULE.CATALOG,
  catalog: ORIGIN_MODULE.CATALOG,
  supplies: ORIGIN_MODULE.SUPPLIES,
  suministros: ORIGIN_MODULE.SUPPLIES,
  security: ORIGIN_MODULE.SECURITY,
  seguridad: ORIGIN_MODULE.SECURITY,
  roles: ORIGIN_MODULE.ROLES,
  providers: ORIGIN_MODULE.PROVIDERS,
  proveedores: ORIGIN_MODULE.PROVIDERS,
  corporate: ORIGIN_MODULE.CORPORATE,
  mail: ORIGIN_MODULE.CORPORATE,
  notifications: ORIGIN_MODULE.CORPORATE,
  system: ORIGIN_MODULE.SYSTEM,
  sistema: ORIGIN_MODULE.SYSTEM,
};

export function normalizeOriginModule(
  input: string | null | undefined,
  fallback: OriginModule = ORIGIN_MODULE.CORPORATE,
): OriginModule {
  const normalized = String(input ?? '')
    .trim()
    .toLowerCase();
  return ORIGIN_MODULE_ALIASES[normalized] ?? fallback;
}

