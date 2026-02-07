import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../../domain/ports/document-series.repository.port';
import { CreateDocumentSerieInput } from '../../dto/inputs';
import { DocumentSerieDetailOutput } from '../../dto/outputs';
import DocumentSerie from '../../../domain/entities/document-serie';

@Injectable()
export class CreateDocumentSerieUseCase {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
  ) {}

  async execute(input: CreateDocumentSerieInput): Promise<DocumentSerieDetailOutput> {
    if (!input.code || !input.name || !input.docType || !input.warehouseId) {
      throw new BadRequestException('code, name, docType y warehouseId son obligatorios');
    }

    const serie = new DocumentSerie(
        undefined,
      input.code,
      input.name,
      input.docType,
      input.warehouseId,
      input.nextNumber ?? 1,
      input.padding ?? 6,
      input.separator ?? '-',
      input.isActive ?? true,
      new Date(),
    );

    const saved = await this.seriesRepo.creatDocumentSerie(serie);

    return {
      id: saved.id,
      code: saved.code,
      name: saved.name,
      docType: saved.docType,
      warehouseId: saved.warehouseId,
      nextNumber: saved.nextNumber,
      padding: saved.padding,
      separator: saved.separator,
      isActive: saved.isActive,
      createdAt: saved.createdAt,
    };
  }
}
