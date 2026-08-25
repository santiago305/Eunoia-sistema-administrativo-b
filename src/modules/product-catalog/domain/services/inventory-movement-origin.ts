import { DocType } from 'src/shared/domain/value-objects/doc-type';
import { ReferenceType } from 'src/shared/domain/value-objects/reference-type';

export interface InventoryMovementOriginNumber {
  serie: string | null;
  correlative: number | string | null;
  separator?: string | null;
  padding?: number | string | null;
}

export interface InventoryMovementOriginInput {
  docType: DocType;
  referenceType: ReferenceType | null;
  documentNumber: InventoryMovementOriginNumber;
  referenceNumber?: InventoryMovementOriginNumber | null;
}

const formatNumber = (
  input?: InventoryMovementOriginNumber | null,
): string | null => {
  if (!input) return null;

  const serie = input.serie?.trim() || null;
  const hasCorrelative =
    input.correlative !== null && input.correlative !== undefined;
  const rawCorrelative = hasCorrelative ? String(input.correlative) : null;
  const parsedPadding = Number(input.padding);
  const padding =
    Number.isInteger(parsedPadding) && parsedPadding > 0 ? parsedPadding : 0;
  const correlative =
    rawCorrelative && padding
      ? rawCorrelative.padStart(padding, '0')
      : rawCorrelative;

  if (serie && correlative) {
    return `${serie}${input.separator || '-'}${correlative}`;
  }

  return serie ?? correlative;
};

const documentTypeLabel: Record<DocType, string> = {
  [DocType.IN]: 'Entrada',
  [DocType.OUT]: 'Salida',
  [DocType.TRANSFER]: 'Transferencia',
  [DocType.ADJUSTMENT]: 'Ajuste',
  [DocType.PRODUCTION]: 'Producción',
  [DocType.SALE_ORDER]: 'Pedido',
};

const referenceTypeLabel: Record<ReferenceType, string> = {
  [ReferenceType.PURCHASE]: 'Compra',
  [ReferenceType.PRODUCTION]: 'Producción',
  [ReferenceType.SALE_ORDER]: 'Pedido',
};

export const buildInventoryMovementOriginLabel = (
  input: InventoryMovementOriginInput,
): string => {
  const referenceLabel = input.referenceType
    ? referenceTypeLabel[input.referenceType]
    : null;
  const referenceNumber = formatNumber(input.referenceNumber);

  if (referenceLabel) {
    return referenceNumber
      ? `${referenceLabel} ${referenceNumber}`
      : referenceLabel;
  }

  const fallbackLabel = documentTypeLabel[input.docType] ?? 'Movimiento';
  const documentNumber = formatNumber(input.documentNumber);
  return documentNumber ? `${fallbackLabel} ${documentNumber}` : fallbackLabel;
};
