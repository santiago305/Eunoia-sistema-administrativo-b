export interface CreateProductRecipeInput {
  finishedVariantId: string;
  primaVariantId: string;
  quantity: number;
  waste?: number;
}
