import { PackTypeormRepository } from './pack.typeorm.repo';

function makeQueryBuilder(rows: Array<{ id: string }>) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    andHaving: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
}

describe('PackTypeormRepository exact composition', () => {
  it('does not query the database for fewer than two distinct components', async () => {
    const createQueryBuilder = jest.fn();
    const repository = new PackTypeormRepository({
      manager: {
        getRepository: jest.fn().mockReturnValue({ createQueryBuilder }),
      },
    } as any);

    await expect(
      repository.findActiveByExactComposition([
        { skuId: 'sku-a', quantity: 1 },
      ]),
    ).resolves.toEqual([]);
    expect(createQueryBuilder).not.toHaveBeenCalled();
  });

  it('filters by active pack, component count, SKU and exact quantity', async () => {
    const queryBuilder = makeQueryBuilder([{ id: 'pack-1' }, { id: 'pack-2' }]);
    const repository = new PackTypeormRepository({
      manager: {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        }),
      },
    } as any);
    const packOne = { pack: { isActive: true }, items: [] } as any;
    const packTwo = { pack: { isActive: true }, items: [] } as any;
    jest
      .spyOn(repository, 'findByIdWithItems')
      .mockResolvedValueOnce(packOne)
      .mockResolvedValueOnce(packTwo);

    await expect(
      repository.findActiveByExactComposition([
        { skuId: 'sku-a', quantity: 1 },
        { skuId: 'sku-b', quantity: 2.5 },
      ]),
    ).resolves.toEqual([packOne, packTwo]);

    expect(queryBuilder.where).toHaveBeenCalledWith('pack.is_active = true');
    expect(queryBuilder.having).toHaveBeenCalledWith(
      'COUNT(item.id) = :componentCount',
      { componentCount: 2 },
    );
    expect(queryBuilder.andHaving).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('item.sku_id = :skuId_0'),
      { skuId_0: 'sku-a', quantity_0: 1 },
    );
    expect(queryBuilder.andHaving).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('item.quantity = :quantity_1'),
      { skuId_1: 'sku-b', quantity_1: 2.5 },
    );
    expect(queryBuilder.limit).toHaveBeenCalledWith(2);
    expect(repository.findByIdWithItems).toHaveBeenNthCalledWith(
      1,
      'pack-1',
      undefined,
    );
    expect(repository.findByIdWithItems).toHaveBeenNthCalledWith(
      2,
      'pack-2',
      undefined,
    );
  });

  it('omits a match that disappears before its details are loaded', async () => {
    const queryBuilder = makeQueryBuilder([{ id: 'pack-1' }]);
    const repository = new PackTypeormRepository({
      manager: {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        }),
      },
    } as any);
    jest.spyOn(repository, 'findByIdWithItems').mockResolvedValue(null);

    await expect(
      repository.findActiveByExactComposition([
        { skuId: 'sku-a', quantity: 1 },
        { skuId: 'sku-b', quantity: 2 },
      ]),
    ).resolves.toEqual([]);
  });
});
