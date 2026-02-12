import { BadRequestException } from '@nestjs/common';
import { ProductId } from 'src/modules/catalag/domain/value-object/product.vo';
import { buildSkuBase } from 'src/shared/utilidades/utils/buildSkuBase';
import { ProductVariantRepository } from 'src/modules/catalag/domain/ports/product-variant.repository';

export async function generateUniqueSku(
  variantRepo: ProductVariantRepository,
  productId: string,
  productName: string,
  color?: string,
  size?: string,
) {
  const prefix = buildSkuBase(productName, color, size);

  const last = await variantRepo.findLastCreated();

  let next = 1;
  if (last?.sku) {
    const parts = last.sku.split('-');
    const lastPart = parts[parts.length - 1];
    const num = Number(lastPart);
    if (Number.isFinite(num)) {
      next = num + 1;
    }
  }

  const sku = `${prefix}-${String(next).padStart(5, '0')}`;
  const exists = await variantRepo.findBySku(sku);
  if (!exists) return sku;

  throw new BadRequestException('No se pudo generar SKU único');
}

