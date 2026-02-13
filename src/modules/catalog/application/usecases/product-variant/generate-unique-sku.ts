import { buildSkuBase } from 'src/shared/utilidades/utils/buildSkuBase';
import { ProductVariantRepository } from 'src/modules/catalog/domain/ports/product-variant.repository';
import { BadRequestException } from '@nestjs/common';

export async function generateUniqueSku(
  variantRepo: ProductVariantRepository,
  productName: string,
  color?: string,
  size?: string,
) {
  const prefix = buildSkuBase(productName, color, size);

  // Ideal: que el repo tenga un método tipo findLastSkuByPrefix(prefix)
  // para evitar intentos lineales.
  let next = 1;

  const MAX_ATTEMPTS = 5000;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const sku = `${prefix}-${String(next).padStart(5, '0')}`;
    const exists = await variantRepo.findBySku(sku);
    if (!exists) return sku;
    next++;
  }

  throw new BadRequestException(`No se pudo generar SKU único para ${prefix}`);
}
