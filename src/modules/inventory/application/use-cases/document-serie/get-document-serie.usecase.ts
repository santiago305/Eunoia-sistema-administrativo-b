import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../../domain/ports/document-series.repository.port';
import { GetDocumentSerieInput } from '../../dto/document-serie/input/get-document-serie-by-id';
import { DocumentSerieOutput } from '../../dto/document-serie/output/document-serie-out';

@Injectable()
export class GetDocumentSerieUseCase {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
  ) {}

  async execute(input: GetDocumentSerieInput): Promise<DocumentSerieOutput> {
    const serie = await this.seriesRepo.findById(input.id);
    if (!serie) {
      throw new BadRequestException('Serie invalida');
    }

    return {
      id: serie.id,
      code: serie.code,
      name: serie.name,
      docType: serie.docType,
      warehouseId: serie.warehouseId,
      nextNumber: serie.nextNumber,
      isActive: serie.isActive,
      createdAt: serie.createdAt,
    };
  }
}
