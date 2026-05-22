import { NotificationQueriesService } from './notification-queries.service';

const createQueryBuilderMock = () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const qb: Record<string, jest.Mock> = {
    innerJoin: jest.fn((...args: unknown[]) => {
      calls.push({ method: 'innerJoin', args });
      return qb;
    }),
    where: jest.fn((...args: unknown[]) => {
      calls.push({ method: 'where', args });
      return qb;
    }),
    andWhere: jest.fn((...args: unknown[]) => {
      calls.push({ method: 'andWhere', args });
      return qb;
    }),
    select: jest.fn((...args: unknown[]) => {
      calls.push({ method: 'select', args });
      return qb;
    }),
    addSelect: jest.fn((...args: unknown[]) => {
      calls.push({ method: 'addSelect', args });
      return qb;
    }),
    getCount: jest.fn(async () => 0),
    getRawOne: jest.fn(async () => ({
      inbox: '0',
      starred: '0',
      trash: '0',
      archived: '0',
      snoozed: '0',
      sent: '0',
    })),
  };
  return { qb, calls };
};

describe('NotificationQueriesService sent view', () => {
  it('counts sent conversations by thread instead of individual sent replies', async () => {
    const { qb, calls } = createQueryBuilderMock();
    const service = new NotificationQueriesService(
      {} as any,
      {} as any,
      { createQueryBuilder: jest.fn(() => qb) } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.countMessages('user-1', { view: 'sent' });

    const whereSql = calls
      .filter((call) => call.method === 'andWhere')
      .map((call) => String(call.args[0]))
      .join('\n');

    expect(whereSql).toContain('NOT EXISTS');
    expect(whereSql).toContain('newer_mus.is_in_sent = true');
  });

  it('counts sidebar sent total as distinct conversations', async () => {
    const { qb, calls } = createQueryBuilderMock();
    const service = new NotificationQueriesService(
      {} as any,
      { count: jest.fn(async () => 0) } as any,
      { createQueryBuilder: jest.fn(() => qb) } as any,
      { createQueryBuilder: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    await service.countSidebarMessages('user-1');

    const sentSelect = calls
      .filter((call) => call.method === 'addSelect')
      .map((call) => String(call.args[0]))
      .find((sql) => sql.includes('sent'));

    expect(sentSelect).toContain('COUNT(DISTINCT COALESCE(m.thread_id, m.id))');
  });

  it('counts scheduled view from messages table', async () => {
    const countMock = jest.fn(async () => 7);
    const service = new NotificationQueriesService(
      {} as any,
      { count: countMock } as any,
      { createQueryBuilder: jest.fn(() => createQueryBuilderMock().qb) } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await service.countMessages('user-1', { view: 'scheduled' });

    expect(result.total).toBe(7);
    expect(countMock).toHaveBeenCalledWith({
      where: {
        createdByUserId: 'user-1',
        isDraft: false,
        status: 'SCHEDULED',
      },
    });
  });
});
