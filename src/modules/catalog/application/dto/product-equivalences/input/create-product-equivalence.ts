export interface CreateProductEquivalenceInput {
  productId: string;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
}
