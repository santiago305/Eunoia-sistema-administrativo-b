import { Source } from "src/modules/sources/domain/entities/source";
import { SourceOutput } from "../dtos/source/output/source.output";

export class SourceOutputMapper {
  static toOutput(source: Source): SourceOutput {
    return {
      id: source.sourceId.value,
      name: source.name,
      detail: source.detail,
      isActive: source.isActive,
    };
  }
}

