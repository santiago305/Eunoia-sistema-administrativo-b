import { Source } from "../entities/source";
import { SourceId } from "../value-objects/source-id.vo";

export class SourceFactory {
  static createSource(params: {
    sourceId?: SourceId;
    name: string;
    detail?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return Source.create(params);
  }
}

