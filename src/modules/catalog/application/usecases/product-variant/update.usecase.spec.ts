import { BadRequestException } from '@nestjs/common';
import { UpdateProductVariant } from './update.usecase';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';

describe('UpdateProductVariant', () => {
  it('actualiza variante y retorna output', async () => {
    const updated = new ProductVariant(
      'VAR-1',
      ProductId.create('PROD-1'),
      'CAB-00001',
      '0001',
      'Color=Negro',
      Money.create(10),
      Money.create(5),
      true,
      new Date('2026-02-10T12:00:00Z'),
    );

    const variantRepo = {
      update: jest.fn().mockResolvedValue(updated),
    };

    const useCase = new UpdateProductVariant(variantRepo as any);

    const result = await useCase.execute({
      id: 'VAR-1',
      sku: 'CAB-00001',
      price: 10,
      cost: 5,
    } as any);

    expect(variantRepo.update).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 'VAR-1',
      productId: 'PROD-1',
      sku: 'CAB-00001',
      barcode: '0001',
      attributes: 'Color=Negro',
      price: 10,
      cost: 5,
      isActive: true,
      createdAt: new Date('2026-02-10T12:00:00Z'),
    });
  });

  it('lanza error si no existe', async () => {
    const variantRepo = {
      update: jest.fn().mockResolvedValue(null),
    };

    const useCase = new UpdateProductVariant(variantRepo as any);

    await expect(
      useCase.execute({ id: 'VAR-1' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

