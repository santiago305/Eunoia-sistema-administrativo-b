import { ExpireDraftsJob } from './expire-drafts.job';

describe('ExpireDraftsJob', () => {
  it('expires only due drafts and records DRAFT_EXPIRED audit entries', async () => {
    const selectQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ id: 'draft-1' }, { id: 'draft-2' }]),
    };
    const updateQuery = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    const messageRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(selectQuery)
        .mockReturnValueOnce(updateQuery),
    };
    const auditRepository = { insert: jest.fn().mockResolvedValue({ identifiers: [] }) };

    const job = new ExpireDraftsJob(messageRepository as any, auditRepository as any);
    const result = await job.run();

    expect(result).toEqual({ updated: 2 });
    expect(updateQuery.where).toHaveBeenCalledWith('id IN (:...ids)', {
      ids: ['draft-1', 'draft-2'],
    });
    expect(auditRepository.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ messageId: 'draft-1', action: 'DRAFT_EXPIRED' }),
        expect.objectContaining({ messageId: 'draft-2', action: 'DRAFT_EXPIRED' }),
      ]),
    );
  });

  it('does not write when there are no due drafts', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    const messageRepository = { createQueryBuilder: jest.fn().mockReturnValue(query) };
    const auditRepository = { insert: jest.fn() };

    const result = await new ExpireDraftsJob(messageRepository as any, auditRepository as any).run();

    expect(result).toEqual({ updated: 0 });
    expect(auditRepository.insert).not.toHaveBeenCalled();
  });
});
