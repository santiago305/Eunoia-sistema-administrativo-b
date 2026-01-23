import { UnauthorizedException } from '@nestjs/common';
import { ListDesactiveUseCase } from './list-desactive-users.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('ListDesactiveUseCase', () => {
    let mockRepo: { listUsers: jest.Mock };
    let useCase: ListDesactiveUseCase;

    beforeEach(() => {
        mockRepo = { listUsers: jest.fn() };
        useCase = new ListDesactiveUseCase(mockRepo as any);
    });

    it('throws UnauthorizedException if requester is not ADMIN or MODERATOR', async () => {
        await expect(useCase.execute({}, RoleType.ADVISER)).rejects.toBeInstanceOf(UnauthorizedException);
        expect(mockRepo.listUsers).not.toHaveBeenCalled();
    });

    it('calls repository.listUsers with provided params and whereClause when requester is ADMIN', async () => {
        const params = { page: 2, filters: { role: 'SOME' }, sortBy: 'name', order: 'ASC' } as const;
        const expectedResult = { data: [], total: 0 };
        mockRepo.listUsers.mockResolvedValue(expectedResult);

        const result = await useCase.execute(params, RoleType.ADMIN);

        expect(mockRepo.listUsers).toHaveBeenCalledWith({
            page: params.page,
            filters: params.filters,
            sortBy: params.sortBy,
            order: params.order,
            whereClause: 'user.deleted = true',
        });
        expect(result).toBe(expectedResult);
    });

    it('scopes filters.role to ADVISER when requester is MODERATOR (overrides existing role)', async () => {
        const params = { page: 1, filters: { role: 'ADMIN', extra: 'x' }, sortBy: 'createdAt', order: 'DESC' } as any;
        const expectedResult = { data: [{ id: 1 }], total: 1 };
        mockRepo.listUsers.mockResolvedValue(expectedResult);

        const result = await useCase.execute(params, RoleType.MODERATOR);

        expect(mockRepo.listUsers).toHaveBeenCalledWith({
            page: params.page,
            filters: { ...(params.filters || {}), role: RoleType.ADVISER },
            sortBy: params.sortBy,
            order: params.order,
            whereClause: 'user.deleted = true',
        });
        expect(result).toBe(expectedResult);
    });

    it('applies ADVISER role when requester is MODERATOR and no filters provided', async () => {
        const params = { page: 3 } as any;
        mockRepo.listUsers.mockResolvedValue({ data: [], total: 0 });

        await useCase.execute(params, RoleType.MODERATOR);

        expect(mockRepo.listUsers).toHaveBeenCalledWith({
            page: params.page,
            filters: { role: RoleType.ADVISER },
            sortBy: undefined,
            order: undefined,
            whereClause: 'user.deleted = true',
        });
    });
});