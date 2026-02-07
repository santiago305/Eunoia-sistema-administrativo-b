import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../../domain/ports/document-series.repository.port';
import { GetActiveDocumentSerieInput } from '../../dto/inputs';
import { DocumentSerieDetailOutput } from '../../dto/outputs';

@Injectable()
export class GetActiveDocumentSerieUseCase {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
  ) {}

  async execute(input: GetActiveDocumentSerieInput): Promise<DocumentSerieDetailOutput> {
    const serie = await this.seriesRepo.findActiveFor({
      docType: input.docType,
      warehouseId: input.warehouseId,
    });

    if (!serie) {
      throw new BadRequestException('Serie activa no encontrada');
    }

    return {
      id: serie.id,
      code: serie.code,
      name: serie.name,
      docType: serie.docType,
      warehouseId: serie.warehouseId,
      nextNumber: serie.nextNumber,
      padding: serie.padding,
      separator: serie.separator,
      isActive: serie.isActive,
      createdAt: serie.createdAt,
    };
  }
}
