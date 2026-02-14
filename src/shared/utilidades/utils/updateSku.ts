import { buildSkuBase } from 'src/shared/utilidades/utils/buildSkuBase';

export function buildSkuPreservingSeries(
  currentSku: string,
  productName: string,
  color?: string,
  presentation?: string,
  variant?: string,
) {
  const prefix = buildSkuBase(productName, color, presentation, variant);

  // Espera formato: PREFIX-00001 (serie numérica al final)
  const parts = currentSku.split('-');
  const last = parts[parts.length - 1];

  // Si no hay serie numérica válida, devuelve el SKU original
  if (!/^\d+$/.test(last)) return currentSku;

  return `${prefix}-${last}`;
}
