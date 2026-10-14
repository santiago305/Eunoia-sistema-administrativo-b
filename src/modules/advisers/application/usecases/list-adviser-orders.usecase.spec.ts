import { ListAdviserOrdersUsecase } from './list-adviser-orders.usecase';

const createBuilder = () => {
  const builder: Record<string, jest.Mock> = {};
  ['leftJoin', 'where', 'andWhere', 'select', 'addSelect', 'orderBy', 'addOrderBy', 'skip', 'take'].forEach((method) => {
    builder[method] = jest.fn().mockReturnValue(builder);
  });
  builder.clone = jest.fn().mockReturnValue({ getCount: jest.fn().mockResolvedValue(1) });
  builder.getRawMany = jest.fn().mockResolvedValue([{
    id: 'order-1', serie: 'P', correlative: 1, createdAt: '2026-10-14T12:00:00.000Z',
    clientName: 'Cliente', total: '100.00', currency: 'PEN',
    collectedByCurrency: [
      { currency: 'PEN', amount: '80.00' },
      { currency: 'USD', amount: '12.00' },
    ],
    stateName: 'Abierto', stateColor: '#000000',
  }]);
  return builder;
};

describe('ListAdviserOrdersUsecase currency metrics', () => {
  it('returns the order currency and keeps posted collections separated by their actual currency', async () => {
    const builder = createBuilder();
    const usecase = new ListAdviserOrdersUsecase({ createQueryBuilder: jest.fn().mockReturnValue(builder) } as never);

    const result = await usecase.execute({ adviserUserId: 'user-1' });

    expect(result.items[0]).toMatchObject({
      currency: 'PEN',
      total: 100,
      collectedTotal: 80,
      collectedByCurrency: [
        { currency: 'PEN', amount: 80 },
        { currency: 'USD', amount: 12 },
      ],
    });
    expect(builder.addSelect).toHaveBeenCalledWith('o.currency', 'currency');
  });
});
