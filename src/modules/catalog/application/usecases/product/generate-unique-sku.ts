import { buildSkuBase } from 'src/shared/utilidades/utils/buildSkuBase';
import { InternalServerErrorException } from '@nestjs/common';
import { TransactionContext } from 'src/modules/inventory/domain/ports/unit-of-work.port';
import { ProductRepository } from 'src/modules/catalog/domain/ports/product.repository';

export async function generateUniqueProductSku(
  productRepo: ProductRepository,
  productName: string,
  color?: string,
  presentation?: string,
  variant?: string,
  tx?: TransactionContext,
) {
  const prefix = buildSkuBase(productName, color, presentation, variant);

  const lastProduct = await productRepo.findLastCreated(tx);
  const lastSku = lastProduct ? lastProduct.getSku() : undefined;
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
    const exists = await productRepo.findBySku(sku, tx);
    if (!exists) return sku;
    next++;
  }

  throw new InternalServerErrorException({type: 'error', message: `No se pudo generar SKU unico para ${prefix}`});
}
