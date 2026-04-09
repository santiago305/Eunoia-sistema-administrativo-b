export interface MonthlyProjectionOutput {
  months: Array<{ month: string; salida: number }>;
  xo: { month: string; salida: number } | null;
  xu: { month: string; salida: number } | null;
  salesActual: { month: string; salida: number } | null;
  growthRate: number;
  projectedNextMonth: number;
  monthsCount: number;
}
