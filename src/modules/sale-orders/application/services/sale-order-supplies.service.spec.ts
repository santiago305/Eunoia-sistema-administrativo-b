import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { SaleOrderSupplyItemRepository } from '../../domain/ports/sale-order-supply-item.repository';
import { SaleOrderSuppliesService } from './sale-order-supplies.service';

const tx = {} as TransactionContext;
const catalog = {
  supplies: [{
    supplySkuId: 'supply-1',
    isActiveSupply: true,
    supplyName: 'Bolsa',
    skuName: 'Bolsa mediana',
    backendSku: 'INS-001',
    customSku: null,
  }],
  units: [{ unitId: 'unit-1', unitName: 'Unidad', unitCode: 'UND' }],
};

const createRepository = (): jest.Mocked<SaleOrderSupplyItemRepository> => ({
  saleOrderExists: jest.fn().mockResolvedValue(true),
  listBySaleOrderId: jest.fn(),
  findCatalogItems: jest.fn().mockResolvedValue(catalog),
  findRecipeItemsByWorkflowId: jest.fn().mockResolvedValue([]),
  findRecipeItemsByIds: jest.fn().mockResolvedValue([]),
  replace: jest.fn().mockResolvedValue([]),
});

describe('SaleOrderSuppliesService', () => {
  it('replaces supplies atomically and persists catalog snapshots', async () => {
    const repository = createRepository();
    const unitOfWork = { runInTransaction: jest.fn((work) => work(tx)) };
    const service = new SaleOrderSuppliesService(repository, unitOfWork);

    await service.replace('order-1', [{ supplySkuId: 'supply-1', quantity: 1.25, unitId: 'unit-1' }]);

    expect(unitOfWork.runInTransaction).toHaveBeenCalledTimes(1);
    expect(repository.replace).toHaveBeenCalledWith('order-1', [expect.objectContaining({
      quantity: 1.25,
      supplyNameSnapshot: 'Bolsa',
      backendSkuSnapshot: 'INS-001',
      unitNameSnapshot: 'Unidad',
      referenceRecipeItemId: null,
    })], tx);
  });

  it('copies the selected workflow recipe with traceable references', async () => {
    const repository = createRepository();
    repository.findRecipeItemsByWorkflowId.mockResolvedValue([{
      recipeItemId: 'recipe-item-1', supplySkuId: 'supply-1', quantity: 2, unitId: 'unit-1',
    }]);
    const service = new SaleOrderSuppliesService(repository, { runInTransaction: (work) => work(tx) });

    await service.copyFromWorkflowRecipe('order-1', 'workflow-1');

    expect(repository.replace).toHaveBeenCalledWith('order-1', [expect.objectContaining({
      supplySkuId: 'supply-1', quantity: 2, referenceRecipeItemId: 'recipe-item-1',
    })], tx);
  });

  it.each([0, 0.001, 1.234])('rejects invalid quantity %s', async (quantity) => {
    const repository = createRepository();
    const service = new SaleOrderSuppliesService(repository, { runInTransaction: (work) => work(tx) });
    await expect(service.replace('order-1', [
      { supplySkuId: 'supply-1', quantity, unitId: 'unit-1' },
    ])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate supplies', async () => {
    const repository = createRepository();
    const service = new SaleOrderSuppliesService(repository, { runInTransaction: (work) => work(tx) });
    await expect(service.replace('order-1', [
      { supplySkuId: 'supply-1', quantity: 1, unitId: 'unit-1' },
      { supplySkuId: 'supply-1', quantity: 2, unitId: 'unit-1' },
    ])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing order before replacing data', async () => {
    const repository = createRepository();
    repository.saleOrderExists.mockResolvedValue(false);
    const service = new SaleOrderSuppliesService(repository, { runInTransaction: (work) => work(tx) });
    await expect(service.replace('missing', [])).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.replace).not.toHaveBeenCalled();
  });
});
