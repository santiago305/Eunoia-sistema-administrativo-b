import { buildSkuBase } from 'src/shared/utilidades/utils/buildSkuBase';
import { InternalServerErrorException } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { SkuCounterRepository } from 'src/modules/catalog/domain/ports/sku-counter.repository';

export async function generateUniqueSku(
  skuCounterRepo: SkuCounterRepository,
  productName: string,
  color?: string,
  presentation?: string,
  variant?: string,
  tx?: TransactionContext,
) {
  const prefix = buildSkuBase(productName, color, presentation, variant);

  const next = await skuCounterRepo.reserveNext(tx); // global
  if (!Number.isFinite(next) || next <= 0) {
    throw new InternalServerErrorException({
      type: 'error',
      message: `No se pudo generar correlativo para ${prefix}`,
    });
  }

  const sku = `${prefix}-${String(next).padStart(5, '0')}`;
  return sku;
}
