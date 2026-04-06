import { DocumentSerieDetailOutput } from "../dto/document-serie/output/document-serie-detail-out";
import { DocumentSerieOutput } from "../dto/document-serie/output/document-serie-out";
import DocumentSerie from "../../domain/entities/document-serie";

export class DocumentSerieOutputMapper {
  static toOutput(serie: DocumentSerie): DocumentSerieOutput {
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

  static toDetailOutput(series: DocumentSerie[]): DocumentSerieDetailOutput {
    return {
      items: series.map((serie) => this.toOutput(serie)),
    };
  }
}
