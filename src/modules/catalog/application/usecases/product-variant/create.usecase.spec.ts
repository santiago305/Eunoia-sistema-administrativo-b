import { NotFoundException } from '@nestjs/common';
import { CreateProductVariant } from './create.usecase';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';

describe('CreateProductVariant', () => {
  const productUuid = '11111111-1111-4111-8111-111111111111';

  it('lanza error si el producto no existe', async () => {
    const productRepo = {
      findById: jest.fn().mockResolvedValue(null),
    };

    const variantRepo = {
      findByBarcode: jest.fn(),
      findLastSkuByProductId: jest.fn(),
      findLastSkuByPrefix: jest.fn(),
      findLastCreated: jest.fn(),
      findBySku: jest.fn(),
      create: jest.fn(),
    };

    const clock = { now: jest.fn().mockReturnValue(new Date('2026-02-10T12:00:00Z')) };

    const useCase = new CreateProductVariant(productRepo as any, variantRepo as any, clock as any);

    await expect(
      useCase.execute({ productId: productUuid, barcode: '0001', attributes: {}, price: 10, cost: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('crea variante con sku generado', async () => {
    const productId = ProductId.create(productUuid);
    const product = new Product(productId, 'Cable', 'Cable USB', true, new Date(), new Date());
    const productRepo = {
      findById: jest.fn().mockResolvedValue(product),
    };

    const variantRepo = {
      findByBarcode: jest.fn().mockResolvedValue(null),
      findLastSkuByProductId: jest.fn().mockResolvedValue(null),
      findLastSkuByPrefix: jest.fn().mockResolvedValue(null),
      findLastCreated: jest.fn().mockResolvedValue(null),
      findBySku: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };

    const now = new Date('2026-02-10T12:00:00Z');
    const clock = { now: jest.fn().mockReturnValue(now) };

    const created = new ProductVariant(
      '22222222-2222-4222-8222-222222222222',
      productId,
      'CAB-00001',
      '0001',
      { color: 'Negro' },
      Money.create(10),
      Money.create(5),
      true,
      now,
    );

    (variantRepo.create as jest.Mock).mockResolvedValue(created);

    const useCase = new CreateProductVariant(productRepo as any, variantRepo as any, clock as any);

    const result = await useCase.execute({
      productId: productUuid,
      barcode: '0001',
      attributes: { color: 'Negro' },
      price: 10,
      cost: 5,
    });

    expect(variantRepo.findBySku).toHaveBeenCalledWith('CAB-NEGRO-00001');
    expect(variantRepo.create).toHaveBeenCalledWith(expect.any(ProductVariant));
    expect(result).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      productId: productUuid,
      productName: 'Cable',
      productDescription: 'Cable USB',
      sku: 'CAB-00001',
      barcode: '0001',
      attributes: { color: 'Negro' },
      price: 10,
      cost: 5,
      isActive: true,
      createdAt: now,
    });
  });
});
