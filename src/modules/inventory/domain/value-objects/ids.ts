const normalizeId = (value: string, label: string) => {
  const v = value?.trim();
  if (!v) {
    throw new Error(`${label} invalido`);
  }
  return v;
};

export class InventoryDocumentId {
  readonly value: string;
  constructor(value: string) {
    this.value = normalizeId(value, 'docId');
  }
}

export class InventoryDocumentItemId {
  readonly value: string;
  constructor(value: string) {
    this.value = normalizeId(value, 'itemId');
  }
}

export class InventoryLedgerId {
  readonly value: string;
  constructor(value: string) {
    this.value = normalizeId(value, 'ledgerId');
  }
}

export class WarehouseId {
  readonly value: string;
  constructor(value: string) {
    this.value = normalizeId(value, 'warehouseId');
  }
}

export class LocationId {
  readonly value: string;
  constructor(value: string) {
    this.value = normalizeId(value, 'locationId');
  }
}

export class VariantId {
  readonly value: string;
  constructor(value: string) {
    this.value = normalizeId(value, 'variantId');
  }
}

export class UserId {
  readonly value: string;
  constructor(value: string) {
    this.value = normalizeId(value, 'userId');
  }
}

export class SeriesId {
  readonly value: string;
  constructor(value: string) {
    this.value = normalizeId(value, 'seriesId');
  }
}
