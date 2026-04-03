import {
  InvalidPurchaseCorrelativeError,
  InvalidPurchaseOrderDocumentError,
  InvalidPurchaseSerieError,
} from "../errors/purchase-order.errors";
import { VoucherDocType } from "./voucher-doc-type";

export class PurchaseOrderDocument {
  public readonly documentType: VoucherDocType;
  public readonly serie: string;
  public readonly correlative: number;

  private constructor(documentType: VoucherDocType, serie: string, correlative: number) {
    this.documentType = documentType;
    this.serie = serie;
    this.correlative = correlative;
  }

  static create(params: {
    documentType?: VoucherDocType;
    serie?: string;
    correlative?: number;
  }): PurchaseOrderDocument | null {
    const hasDocType = params.documentType !== undefined && params.documentType !== null;
    const hasSerie = params.serie !== undefined && params.serie !== null && String(params.serie).trim().length > 0;
    const hasCorrelative = params.correlative !== undefined && params.correlative !== null;

    if (!hasDocType && !hasSerie && !hasCorrelative) return null;

    if (!hasDocType || !hasSerie || !hasCorrelative) {
      throw new InvalidPurchaseOrderDocumentError();
    }

    const serie = String(params.serie).trim();
    if (!serie) {
      throw new InvalidPurchaseSerieError();
    }

    const correlative = Number(params.correlative);
    if (!Number.isInteger(correlative) || correlative <= 0) {
      throw new InvalidPurchaseCorrelativeError();
    }

    return new PurchaseOrderDocument(params.documentType!, serie, correlative);
  }
}
