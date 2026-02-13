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

  const lastSku = await variantRepo.findLastSkuByPrefix(prefix);
  let next = 1;

  if (lastSku) {
    const parts = lastSku.split('-');
    const suffix = Number(parts[parts.length - 1]);
    if (Number.isFinite(suffix) && suffix > 0) {
      next = suffix + 1;
    }
  }

  const MAX_ATTEMPTS = 5000;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const sku = `${prefix}-${String(next).padStart(5, '0')}`;
    const exists = await variantRepo.findBySku(sku);
    if (!exists) return sku;
    next++;
  }

  throw new BadRequestException(`No se pudo generar SKU unico para ${prefix}`);
}
