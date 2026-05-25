import { Inject, NotFoundException } from "@nestjs/common";
import { SOURCE_REPOSITORY, SourceRepository } from "src/modules/sources/domain/ports/source.repository";
import { GetSourceInput } from "../../dtos/source/input/get-by-id.input";
import { SourceDetailOutput } from "../../dtos/source/output/source-detail.output";
import { SourceOutputMapper } from "../../mappers/source-output.mapper";
import { SourceNotFoundError } from "../../errors/source-not-found.error";

export class GetSourceUsecase {
  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepo: SourceRepository,
  ) {}

  async execute(input: GetSourceInput): Promise<SourceDetailOutput> {
    const source = await this.sourceRepo.findById(input.sourceId);
    if (!source) {
      throw new NotFoundException(new SourceNotFoundError().message);
    }

    return {
      ...SourceOutputMapper.toOutput(source),
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }
}

