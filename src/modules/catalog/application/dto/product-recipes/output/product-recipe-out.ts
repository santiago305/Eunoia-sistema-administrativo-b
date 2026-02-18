export interface ProductRecipeOutput {
  id: string;
  finishedVariantId: string;
  primaVariantId: string;
  quantity: number;
  waste?: number;
}
