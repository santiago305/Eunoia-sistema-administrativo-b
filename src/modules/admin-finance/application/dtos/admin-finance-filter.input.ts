import { AdminFinanceFilters, AdminFinanceListFilters } from "./admin-finance.output";

export type AdminFinanceFilterInput = Partial<AdminFinanceFilters> & {
  page?: number | string;
  limit?: number | string;
};

const cleanString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const cleanType = (value: unknown) =>
  value === "INCOME" || value === "EXPENSE" ? value : undefined;

const cleanNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function normalizeAdminFinanceFilters(
  input: AdminFinanceFilterInput = {},
): AdminFinanceListFilters {
  return {
    from: cleanString(input.from),
    to: cleanString(input.to),
    type: cleanType(input.type),
    status: cleanString(input.status),
    q: cleanString(input.q),
    page: cleanNumber(input.page, 1),
    limit: Math.min(cleanNumber(input.limit, 50), 200),
  };
}
