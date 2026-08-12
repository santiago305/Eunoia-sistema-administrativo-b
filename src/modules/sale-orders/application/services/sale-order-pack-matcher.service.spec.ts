import { BadRequestException } from '@nestjs/common';
import { SaleOrderPackMatcherService } from './sale-order-pack-matcher.service';

const makePack = (id: string, isActive = true) =>
  ({
    pack: {
      packId: { value: id },
      description: `Pack ${id}`,
      total: 20,
      isActive,
    },
    items: [],
  }) as any;

describe('SaleOrderPackMatcherService', () => {
  it('groups repeated SKUs, rounds quantities and sorts the composition', async () => {
    const pack = makePack('pack-1');
    const packRepo = {
      findActiveByExactComposition: jest.fn().mockResolvedValue([pack]),
    };
    const service = new SaleOrderPackMatcherService(packRepo as any);

    const result = await service.match([
      { skuId: ' sku-b ', quantity: 2.346 },
      { skuId: 'sku-a', quantity: 0.504 },
      { skuId: 'sku-a', quantity: 0.506 },
    ]);

    expect(packRepo.findActiveByExactComposition).toHaveBeenCalledWith(
      [
        { skuId: 'sku-a', quantity: 1.01 },
        { skuId: 'sku-b', quantity: 2.35 },
      ],
      undefined,
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'UNIQUE',
        pack,
      }),
    );
  });

  it('does not query packs when the composition has only one distinct SKU', async () => {
    const packRepo = {
      findActiveByExactComposition: jest.fn(),
    };
    const service = new SaleOrderPackMatcherService(packRepo as any);

    await expect(
      service.match([
        { skuId: 'sku-a', quantity: 1 },
        { skuId: 'sku-a', quantity: 2 },
      ]),
    ).resolves.toEqual({
      status: 'NONE',
      composition: [{ skuId: 'sku-a', quantity: 3 }],
      matches: [],
    });
    expect(packRepo.findActiveByExactComposition).not.toHaveBeenCalled();
  });

  it('returns NONE when no active pack has the exact composition', async () => {
    const packRepo = {
      findActiveByExactComposition: jest.fn().mockResolvedValue([]),
    };
    const service = new SaleOrderPackMatcherService(packRepo as any);

    await expect(
      service.match([
        { skuId: 'sku-a', quantity: 1 },
        { skuId: 'sku-b', quantity: 2 },
      ]),
    ).resolves.toEqual({
      status: 'NONE',
      composition: [
        { skuId: 'sku-a', quantity: 1 },
        { skuId: 'sku-b', quantity: 2 },
      ],
      matches: [],
    });
  });

  it('returns AMBIGUOUS when more than one active pack matches', async () => {
    const matches = [makePack('pack-1'), makePack('pack-2')];
    const packRepo = {
      findActiveByExactComposition: jest.fn().mockResolvedValue(matches),
    };
    const service = new SaleOrderPackMatcherService(packRepo as any);

    const result = await service.match([
      { skuId: 'sku-a', quantity: 1 },
      { skuId: 'sku-b', quantity: 2 },
    ]);

    expect(result).toEqual(
      expect.objectContaining({ status: 'AMBIGUOUS', matches }),
    );
  });

  it('ignores inactive matches defensively', async () => {
    const activePack = makePack('pack-active');
    const packRepo = {
      findActiveByExactComposition: jest
        .fn()
        .mockResolvedValue([makePack('pack-inactive', false), activePack]),
    };
    const service = new SaleOrderPackMatcherService(packRepo as any);

    await expect(
      service.match([
        { skuId: 'sku-a', quantity: 1 },
        { skuId: 'sku-b', quantity: 2 },
      ]),
    ).resolves.toEqual(
      expect.objectContaining({ status: 'UNIQUE', pack: activePack }),
    );
  });

  it.each([
    [[{ skuId: '', quantity: 1 }], 'SKU'],
    [[{ skuId: 'sku-a', quantity: 0 }], 'cantidad'],
    [[{ skuId: 'sku-a', quantity: Number.NaN }], 'cantidad'],
  ])('rejects an invalid composition', async (composition, message) => {
    const service = new SaleOrderPackMatcherService({} as any);

    await expect(service.match(composition as any)).rejects.toEqual(
      expect.objectContaining<Partial<BadRequestException>>({
        message: expect.stringContaining(message),
      }),
    );
  });
});
