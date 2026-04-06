import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { CreateDocumentSerieInput } from '../../dto/document-serie/input/create-document-serie';
import { DocumentSerieOutput } from '../../dto/document-serie/output/document-serie-out';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../ports/document-series.repository.port';
import { DocumentSerieFactory } from '../../../domain/factories/document-serie.factory';
import { DocumentSerieOutputMapper } from '../../mappers/document-serie-output.mapper';
import { InvalidDocumentSerieError } from '../../../domain/errors/invalid-document-serie.error';

@Injectable()
export class CreateDocumentSerieUseCase {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
  ) {}

  async execute(input: CreateDocumentSerieInput): Promise<DocumentSerieOutput> {
    let serie;
    try {
      serie = DocumentSerieFactory.create({
        code: input.code,
        name: input.name,
        docType: input.docType,
        warehouseId: input.warehouseId,
        nextNumber: input.nextNumber,
        padding: input.padding,
        separator: input.separator,
        isActive: input.isActive,
      });
    } catch (error) {
      if (error instanceof InvalidDocumentSerieError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const saved = await this.seriesRepo.creatDocumentSerie(serie);
    return DocumentSerieOutputMapper.toOutput(saved);
  }
}
