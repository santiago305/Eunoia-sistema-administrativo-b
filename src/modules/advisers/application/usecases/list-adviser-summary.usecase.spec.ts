import { ListAdviserSummaryUsecase } from './list-adviser-summary.usecase';

const createQueryBuilder = () => {
  const builder: Record<string, jest.Mock> = {};
  [
    'innerJoin',
    'leftJoin',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'groupBy',
    'addGroupBy',
    'orderBy',
    'andHaving',
  ].forEach((method) => {
    builder[method] = jest.fn().mockReturnValue(builder);
  });
  builder.getRawMany = jest.fn().mockResolvedValue([
    {
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      isActive: true,
      assignedOrders: '4',
      soldTotal: '1200',
      collectedTotal: '900',
    },
  ]);
  return builder;
};

describe('ListAdviserSummaryUsecase permissions', () => {
  const execute = async (capabilities: {
    includeOrderSummary: boolean;
    includePerformanceSummary: boolean;
  }) => {
    const builder = createQueryBuilder();
    const advisers = { createQueryBuilder: jest.fn().mockReturnValue(builder) };
    const searchStorage = { touchRecentSearch: jest.fn() };
    const usecase = new ListAdviserSummaryUsecase(
      advisers as never,
      {} as never,
      searchStorage as never,
    );

    return usecase.execute(capabilities);
  };

  it('returns only general adviser data without summary permissions', async () => {
    const result = await execute({
      includeOrderSummary: false,
      includePerformanceSummary: false,
    });

    expect(result.items).toEqual([
      {
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        isActive: true,
      },
    ]);
  });

  it('returns the order count without exposing financial performance', async () => {
    const result = await execute({
      includeOrderSummary: true,
      includePerformanceSummary: false,
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({ assignedOrders: 4 }),
    );
    expect(result.items[0]).not.toHaveProperty('soldTotal');
    expect(result.items[0]).not.toHaveProperty('collectedTotal');
  });

  it('returns the complete performance summary with its permission', async () => {
    const result = await execute({
      includeOrderSummary: false,
      includePerformanceSummary: true,
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        assignedOrders: 4,
        soldTotal: 1200,
        collectedTotal: 900,
      }),
    );
  });
});
