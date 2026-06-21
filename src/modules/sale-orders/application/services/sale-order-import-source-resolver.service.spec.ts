import { Test } from '@nestjs/testing';
import { CreateSourceUsecase } from 'src/modules/sources/application/usecases/source/create.usecase';
import { SOURCE_REPOSITORY } from 'src/modules/sources/domain/ports/source.repository';
import { SaleOrderImportSourceResolverService } from './sale-order-import-source-resolver.service';

describe('SaleOrderImportSourceResolverService', () => {
  const tx = {} as any;
  const sourceRepo = { findByNormalizedName: jest.fn() };
  const createSourceUsecase = { executeInTransaction: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function createService() {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SaleOrderImportSourceResolverService,
        { provide: SOURCE_REPOSITORY, useValue: sourceRepo },
        { provide: CreateSourceUsecase, useValue: createSourceUsecase },
      ],
    }).compile();

    return {
      moduleRef,
      service: moduleRef.get(SaleOrderImportSourceResolverService),
    };
  }

  it('reuses an existing source with the same normalized name', async () => {
    sourceRepo.findByNormalizedName.mockResolvedValue({
      sourceId: { value: 'source-existing' },
    });
    const { moduleRef, service } = await createService();

    try {
      await expect(service.resolveOrCreate('venta por Facebook', tx)).resolves.toBe(
        'source-existing',
      );
      expect(sourceRepo.findByNormalizedName).toHaveBeenCalledWith('FACEBOOK', tx);
      expect(createSourceUsecase.executeInTransaction).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it('creates the source when no normalized name exists', async () => {
    sourceRepo.findByNormalizedName.mockResolvedValue(null);
    createSourceUsecase.executeInTransaction.mockResolvedValue('source-new');
    const { moduleRef, service } = await createService();

    try {
      await expect(service.resolveOrCreate('wsp', tx)).resolves.toBe('source-new');
      expect(sourceRepo.findByNormalizedName).toHaveBeenCalledWith('WHATSAPP', tx);
      expect(createSourceUsecase.executeInTransaction).toHaveBeenCalledWith(
        { name: 'WHATSAPP', detail: 'WHATSAPP', isActive: true },
        tx,
      );
    } finally {
      await moduleRef.close();
    }
  });
});
