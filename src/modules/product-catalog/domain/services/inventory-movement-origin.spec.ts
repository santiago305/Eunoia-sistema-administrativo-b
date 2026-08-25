import { DocType } from 'src/shared/domain/value-objects/doc-type';
import { ReferenceType } from 'src/shared/domain/value-objects/reference-type';
import { buildInventoryMovementOriginLabel } from './inventory-movement-origin';

describe('buildInventoryMovementOriginLabel', () => {
  it.each([
    [
      ReferenceType.SALE_ORDER,
      { serie: 'PE', correlative: 1, separator: '-', padding: 3 },
      'Pedido PE-001',
    ],
    [
      ReferenceType.PURCHASE,
      { serie: 'F001', correlative: 245 },
      'Compra F001-245',
    ],
    [
      ReferenceType.PRODUCTION,
      { serie: 'PR', correlative: 15, separator: '-', padding: 3 },
      'Producción PR-015',
    ],
  ])('formats %s references', (referenceType, referenceNumber, expected) => {
    expect(
      buildInventoryMovementOriginLabel({
        docType: DocType.OUT,
        referenceType,
        referenceNumber,
        documentNumber: { serie: 'OUT', correlative: 99 },
      }),
    ).toBe(expected);
  });

  it.each([
    [DocType.TRANSFER, 'Transferencia TR-008'],
    [DocType.ADJUSTMENT, 'Ajuste AJ-008'],
    [DocType.IN, 'Entrada IN-008'],
    [DocType.OUT, 'Salida OUT-008'],
  ])('uses the inventory document for %s movements', (docType, expected) => {
    expect(
      buildInventoryMovementOriginLabel({
        docType,
        referenceType: null,
        documentNumber: {
          serie:
            docType === DocType.TRANSFER
              ? 'TR'
              : docType === DocType.ADJUSTMENT
                ? 'AJ'
                : docType,
          correlative: 8,
          padding: 3,
        },
      }),
    ).toBe(expected);
  });

  it('keeps a useful label when a historical reference has no related row', () => {
    expect(
      buildInventoryMovementOriginLabel({
        docType: DocType.OUT,
        referenceType: ReferenceType.SALE_ORDER,
        referenceNumber: null,
        documentNumber: { serie: 'OUT', correlative: 10 },
      }),
    ).toBe('Pedido');
  });
});
