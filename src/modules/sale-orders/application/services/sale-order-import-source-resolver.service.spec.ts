import { Test } from '@nestjs/testing';
import { CreateSourceUsecase } from 'src/modules/sources/application/usecases/source/create.usecase';
import { SOURCE_REPOSITORY } from 'src/modules/sources/domain/ports/source.repository';
import { SaleOrderImportSourceResolverService } from './sale-order-import-source-resolver.service';
import { SourceRecognitionCodeService } from 'src/modules/sources/application/services/source-recognition-code.service';

describe('SaleOrderImportSourceResolverService', () => {
  const tx = {} as any;
  const sourceRepo = { findByNormalizedName: jest.fn() };
  const createSourceUsecase = { executeInTransaction: jest.fn() };
  const recognitionCodes = { recognize: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function createService() {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SaleOrderImportSourceResolverService,
        { provide: SOURCE_REPOSITORY, useValue: sourceRepo },
        { provide: CreateSourceUsecase, useValue: createSourceUsecase },
        { provide: SourceRecognitionCodeService, useValue: recognitionCodes },
      ],
    }).compile();

    return {
      moduleRef,
      service: moduleRef.get(SaleOrderImportSourceResolverService),
    };
  }

  it('uses the source associated with the recognition code', async () => {
    recognitionCodes.recognize.mockResolvedValue({
      sourceId: 'source-facebook',
      sourceName: 'FACEBOOK',
      code: 'FB',
      advertisingCode: 'CAMPAÑA JULIO',
    });
    const { moduleRef, service } = await createService();

    try {
      await expect(service.resolveOrCreate('FB CAMPAÑA JULIO', tx)).resolves.toBe(
        'source-facebook',
      );
      expect(sourceRepo.findByNormalizedName).not.toHaveBeenCalled();
      expect(createSourceUsecase.executeInTransaction).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it('creates SIN CODIGO when the note does not start with a configured code', async () => {
    recognitionCodes.recognize.mockResolvedValue(null);
    sourceRepo.findByNormalizedName.mockResolvedValue(null);
    createSourceUsecase.executeInTransaction.mockResolvedValue('source-new');
    const { moduleRef, service } = await createService();

    try {
      await expect(service.resolveOrCreate('RECOMPRA FB JULIO', tx)).resolves.toBe('source-new');
      expect(sourceRepo.findByNormalizedName).toHaveBeenCalledWith('SIN CODIGO', tx);
      expect(createSourceUsecase.executeInTransaction).toHaveBeenCalledWith(
        { name: 'SIN CODIGO', detail: 'SIN CODIGO', isActive: true },
        tx,
      );
    } finally {
      await moduleRef.close();
    }
  });
});
