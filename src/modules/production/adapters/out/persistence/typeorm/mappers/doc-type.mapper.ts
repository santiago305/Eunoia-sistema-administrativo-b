import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductionDocType } from "src/modules/production/domain/value-objects/doc-type.vo";

export class DocTypeMapper {
  static toProduction(value: DocType): ProductionDocType {
    switch (value) {
      case DocType.IN:
        return ProductionDocType.IN;
      case DocType.OUT:
        return ProductionDocType.OUT;
      case DocType.TRANSFER:
        return ProductionDocType.TRANSFER;
      case DocType.ADJUSTMENT:
        return ProductionDocType.ADJUSTMENT;
      case DocType.PRODUCTION:
        return ProductionDocType.PRODUCTION;
      default: {
        const _exhaustive: never = value;
        throw new Error(`Unsupported DocType: ${_exhaustive}`);
      }
    }
  }

  static toInventory(value: ProductionDocType): DocType {
    switch (value) {
      case ProductionDocType.IN:
        return DocType.IN;
      case ProductionDocType.OUT:
        return DocType.OUT;
      case ProductionDocType.TRANSFER:
        return DocType.TRANSFER;
      case ProductionDocType.ADJUSTMENT:
        return DocType.ADJUSTMENT;
      case ProductionDocType.PRODUCTION:
        return DocType.PRODUCTION;
      default: {
        const _exhaustive: never = value;
        throw new Error(`Unsupported ProductionDocType: ${_exhaustive}`);
      }
    }
  }
}

