import { BadRequestException } from '@nestjs/common';
import { CreateProductVariant } from './create.usecase';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';

describe('CreateProductVariant', () => {
  it('lanza error si el producto no existe', async () => {
    const productRepo = {
      findById: jest.fn().mockResolvedValue(null),
    };

    const variantRepo = {
      listByProductId: jest.fn(),
      findBySku: jest.fn(),
      create: jest.fn(),
    };

    const clock = { now: jest.fn().mockReturnValue(new Date('2026-02-10T12:00:00Z')) };

    const useCase = new CreateProductVariant(
      productRepo as any,
      variantRepo as any,
      clock as any,
    );

    await expect(
      useCase.execute({ productId: 'PROD-1' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crea variante con sku generado', async () => {
    const productRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'PROD-1', name: 'Cable' }),
    };

    const variantRepo = {
      listByProductId: jest.fn().mockResolvedValue([]),
      findBySku: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };

    const now = new Date('2026-02-10T12:00:00Z');
    const clock = { now: jest.fn().mockReturnValue(now) };

    const created = new ProductVariant(
      'VAR-1',
      ProductId.create('PROD-1'),
      'CAB-00001',
      '0001',
      'Color=Negro',
      Money.create(10),
      Money.create(5),
      true,
      now,
    );

    (variantRepo.create as jest.Mock).mockResolvedValue(created);

    const useCase = new CreateProductVariant(
      productRepo as any,
      variantRepo as any,
      clock as any,
    );

    const result = await useCase.execute({
      productId: 'PROD-1',
      barcode: '0001',
      attributes: 'Color=Negro',
      price: 10,
      cost: 5,
    } as any);

    expect(variantRepo.findBySku).toHaveBeenCalledWith('CAB-00001');
    expect(variantRepo.create).toHaveBeenCalledWith(expect.any(ProductVariant));
    expect((variantRepo.create as jest.Mock).mock.calls[0][0].sku).toBe('CAB-00001');
    expect(result).toEqual({
      id: 'VAR-1',
      productId: 'PROD-1',
      sku: 'CAB-00001',
      barcode: '0001',
      attributes: 'Color=Negro',
      price: 10,
      cost: 5,
      isActive: true,
      createdAt: now,
    });
  });
});

