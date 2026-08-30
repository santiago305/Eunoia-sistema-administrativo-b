export const AdviserSearchFields = {
  NAME: 'name', EMAIL: 'email', ASSIGNED_ORDERS: 'assignedOrders',
  SOLD_TOTAL: 'soldTotal', COLLECTED_TOTAL: 'collectedTotal', IS_ACTIVE: 'isActive',
} as const;
export type AdviserSearchField = typeof AdviserSearchFields[keyof typeof AdviserSearchFields];
export type AdviserSearchRule = { field: AdviserSearchField; operator: string; mode?: 'include' | 'exclude'; value?: string; values?: string[] };
export type AdviserSearchSnapshot = { q?: string; filters: AdviserSearchRule[] };

const allowedFields = new Set(Object.values(AdviserSearchFields));
const textFields = new Set<string>([AdviserSearchFields.NAME, AdviserSearchFields.EMAIL]);
const numericFields = new Set<string>([AdviserSearchFields.ASSIGNED_ORDERS, AdviserSearchFields.SOLD_TOTAL, AdviserSearchFields.COLLECTED_TOTAL]);
const numericOperators = new Set(['eq', 'gt', 'gte', 'lt', 'lte']);

export function sanitizeAdviserSearchSnapshot(value?: Partial<AdviserSearchSnapshot> | null): AdviserSearchSnapshot {
  const q = String(value?.q ?? '').trim() || undefined;
  const filters = (Array.isArray(value?.filters) ? value.filters : []).flatMap((raw) => {
    if (!raw || !allowedFields.has(raw.field)) return [];
    if (textFields.has(raw.field) && ['contains', 'eq'].includes(raw.operator) && String(raw.value ?? '').trim())
      return [{ field: raw.field, operator: raw.operator, value: String(raw.value).trim() } as AdviserSearchRule];
    if (numericFields.has(raw.field) && numericOperators.has(raw.operator) && !Number.isNaN(Number(raw.value)))
      return [{ field: raw.field, operator: raw.operator, value: String(raw.value) } as AdviserSearchRule];
    if (raw.field === AdviserSearchFields.IS_ACTIVE && raw.operator === 'in') {
      const values = [...new Set((raw.values ?? []).filter((item) => item === 'true' || item === 'false'))];
      return values.length ? [{ field: raw.field, operator: raw.operator, mode: raw.mode === 'exclude' ? 'exclude' : 'include', values } as AdviserSearchRule] : [];
    }
    return [];
  });
  return { q, filters };
}

const labels: Record<AdviserSearchField, string> = { name: 'Nombre', email: 'Correo', assignedOrders: 'Pedidos asignados', soldTotal: 'Total vendido', collectedTotal: 'Total recaudado', isActive: 'Estado' };
export function buildAdviserSearchLabel(snapshot: AdviserSearchSnapshot) {
  const normalized = sanitizeAdviserSearchSnapshot(snapshot);
  const parts = normalized.q ? [`Búsqueda: ${normalized.q}`] : [];
  normalized.filters.forEach((rule) => {
    if (rule.field === AdviserSearchFields.IS_ACTIVE) parts.push(`${rule.mode === 'exclude' ? 'No ' : ''}Estado: ${(rule.values ?? []).map((v) => v === 'true' ? 'Activos' : 'Inactivos').join(', ')}`);
    else parts.push(`${labels[rule.field]} ${rule.operator === 'contains' ? 'contiene' : rule.operator} ${rule.value}`);
  });
  return parts.join(' · ') || 'Sin filtros';
}
