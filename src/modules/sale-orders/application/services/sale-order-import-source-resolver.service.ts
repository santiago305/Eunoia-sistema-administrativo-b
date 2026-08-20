import { Inject, Injectable } from "@nestjs/common";
import { CreateSourceUsecase } from "src/modules/sources/application/usecases/source/create.usecase";
import { SOURCE_REPOSITORY, SourceRepository } from "src/modules/sources/domain/ports/source.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SourceRecognitionCodeService } from "src/modules/sources/application/services/source-recognition-code.service";

@Injectable()
export class SaleOrderImportSourceResolverService {
  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepo: SourceRepository,
    private readonly createSourceUsecase: CreateSourceUsecase,
    private readonly recognitionCodes: SourceRecognitionCodeService,
  ) {}

  async resolveOrCreate(internalNote: string | null | undefined, tx: TransactionContext): Promise<string> {
    const recognized = await this.recognitionCodes.recognize(internalNote);
    if (recognized) return recognized.sourceId;
    return this.resolveOrCreateByName("SIN CODIGO", tx);
  }

  async resolveOrCreateByName(sourceName: string, tx: TransactionContext): Promise<string> {
    const existing = await this.sourceRepo.findByNormalizedName(sourceName, tx);
    if (existing) return existing.sourceId.value;

    return this.createSourceUsecase.executeInTransaction(
      { name: sourceName, detail: sourceName, isActive: true },
      tx,
    );
  }

}
