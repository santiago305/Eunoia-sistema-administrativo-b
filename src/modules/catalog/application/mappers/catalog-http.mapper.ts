import { CreateProductVariantInput } from "../dto/product-variants/input/create-product-variant";
import { ListProductVariantsInput } from "../dto/product-variants/input/list-product-variant";
import { UpdateProductVariantInput } from "../dto/product-variants/input/update-product-variant";
import { CreateProductInput } from "../dto/products/input/create-product";
import { ListProductsInput } from "../dto/products/input/list-products";
import { SetProductActiveInput } from "../dto/products/input/set-active-product";
import { UpdateProductInput } from "../dto/products/input/update-product";

export class CatalogHttpMapper {
  static toCreateProductInput(input: CreateProductInput): CreateProductInput {
    return {
      ...input,
      name: input.name?.trim(),
      description: input.description?.trim() || undefined,
      barcode: input.barcode?.trim() || undefined,
      customSku: input.customSku?.trim() || undefined,
      minStock: input.minStock === undefined ? undefined : input.minStock,
    };
  }

  static toUpdateProductInput(id: string, input: Omit<UpdateProductInput, "id">): UpdateProductInput {
    return {
      ...input,
      id,
      name: input.name?.trim(),
      description: input.description?.trim() || undefined,
      barcode: input.barcode === null ? null : input.barcode?.trim() || undefined,
      customSku: input.customSku === null ? null : input.customSku?.trim() || undefined,
      minStock: input.minStock === undefined ? undefined : input.minStock,
    };
  }

  static toSetProductActiveInput(id: string, isActive: boolean): SetProductActiveInput {
    return { id, isActive };
  }

  static toListProductsInput(input: ListProductsInput): ListProductsInput {
    return {
      ...input,
      q: input.q?.trim() || undefined,
      name: input.name?.trim() || undefined,
      description: input.description?.trim() || undefined,
      sku: input.sku?.trim() || undefined,
      barcode: input.barcode?.trim() || undefined,
    };
  }

  static toCreateProductVariantInput(input: CreateProductVariantInput): CreateProductVariantInput {
    return {
      ...input,
      barcode: input.barcode?.trim() || undefined,
      customSku: input.customSku?.trim() || undefined,
      minStock: input.minStock ?? null,
    };
  }

  static toUpdateProductVariantInput(id: string, input: Omit<UpdateProductVariantInput, "id">): UpdateProductVariantInput {
    return {
      ...input,
      id,
      barcode: input.barcode === null ? null : input.barcode?.trim() || undefined,
      customSku: input.customSku === null ? null : input.customSku?.trim() || undefined,
      minStock: input.minStock ?? null,
    };
  }

  static toListProductVariantsInput(input: ListProductVariantsInput): ListProductVariantsInput {
    return {
      ...input,
      q: input.q?.trim() || undefined,
      productName: input.productName?.trim() || undefined,
      productDescription: input.productDescription?.trim() || undefined,
      sku: input.sku?.trim() || undefined,
      barcode: input.barcode?.trim() || undefined,
    };
  }
}
