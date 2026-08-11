import { BadRequestException } from '@nestjs/common';
import { SaleOrderStockRequirementsService } from './sale-order-stock-requirements.service';

describe('SaleOrderStockRequirementsService', () => {
  const createFixture = () => {
    const itemRepo = {
      listBySaleOrderId: jest.fn().mockResolvedValue([{ id: 'line-1' }]),
    };
    const componentRepo = {
      listBySaleOrderItemIds: jest.fn().mockResolvedValue([
        { skuId: 'product-sku', quantity: 2 },
      ]),
    };
    const supplyRepo = {
      listBySaleOrderId: jest.fn().mockResolvedValue([
        { supplySkuId: 'supply-sku', quantity: 1.25 },
      ]),
    };
    const stockItemRepo = {
      findBySkuId: jest.fn(async (skuId: string) => ({
        id: skuId === 'product-sku' ? 'product-stock' : 'supply-stock',
      })),
    };
    const service = new SaleOrderStockRequirementsService(
      itemRepo as any,
      componentRepo as any,
      stockItemRepo as any,
      supplyRepo as any,
    );
    return { service, supplyRepo, stockItemRepo };
  };

  it('combines product components and the historical supplies of the order', async () => {
    const { service, supplyRepo } = createFixture();

    await expect(service.resolve({ id: 'order-1' } as any, {} as any)).resolves.toEqual([
      { stockItemId: 'product-stock', quantity: 2 },
      { stockItemId: 'supply-stock', quantity: 1.25 },
    ]);
    expect(supplyRepo.listBySaleOrderId).toHaveBeenCalledWith('order-1', {});
  });

  it('groups quantities when a product component and supply use the same stock item', async () => {
    const { service, stockItemRepo } = createFixture();
    stockItemRepo.findBySkuId.mockResolvedValue({ id: 'shared-stock' });

    await expect(service.resolve({ id: 'order-1' } as any)).resolves.toEqual([
      { stockItemId: 'shared-stock', quantity: 3.25 },
    ]);
  });

  it('rejects a supply without an inventory stock item', async () => {
    const { service, stockItemRepo } = createFixture();
    stockItemRepo.findBySkuId.mockImplementation(async (skuId: string) =>
      skuId === 'supply-sku' ? null : { id: 'product-stock' },
    );

    await expect(service.resolve({ id: 'order-1' } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
