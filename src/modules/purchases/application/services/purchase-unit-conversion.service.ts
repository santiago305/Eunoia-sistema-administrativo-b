import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY,
  ProductCatalogEquivalenceRepository,
} from "src/modules/product-catalog/domain/ports/equivalence.repository";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
} from "src/modules/product-catalog/domain/ports/product.repository";
import {
  PRODUCT_CATALOG_SKU_REPOSITORY,
  ProductCatalogSkuRepository,
} from "src/modules/product-catalog/domain/ports/sku.repository";
import {
  PRODUCT_CATALOG_UNIT_REPOSITORY,
  ProductCatalogUnitRepository,
} from "src/modules/product-catalog/domain/ports/unit.repository";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";

@Injectable()
export class PurchaseUnitConversionService {
  constructor(
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly productRepo: ProductCatalogProductRepository,
    @Inject(PRODUCT_CATALOG_UNIT_REPOSITORY)
    private readonly unitRepo: ProductCatalogUnitRepository,
    @Inject(PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY)
    private readonly equivalenceRepo: ProductCatalogEquivalenceRepository,
  ) {}

  async resolveFactor(params: {
    skuId: string;
    unitBase?: string;
    factor?: number;
    tx?: TransactionContext;
  }): Promise<{ factor: number; unitBase?: string; equivalence?: string }> {
    const fallbackFactor =
      params.factor !== undefined && params.factor !== null && Number(params.factor) > 0
        ? Number(params.factor)
        : 1;

    const sourceUnitRaw = params.unitBase?.trim();
    if (!sourceUnitRaw) {
      return { factor: fallbackFactor };
    }

    const sku = await this.skuRepo.findById(params.skuId);
    if (!sku?.sku?.productId) {
      throw new NotFoundException("SKU no encontrado para resolver equivalencia");
    }

    const product = await this.productRepo.findById(sku.sku.productId);
    if (!product) {
      throw new NotFoundException("Producto no encontrado para resolver equivalencia");
    }

    if (!product.baseUnitId) {
      return {
        factor: fallbackFactor,
        unitBase: sourceUnitRaw.toUpperCase(),
      };
    }

    const baseUnit = await this.unitRepo.findById(product.baseUnitId, params.tx);
    if (!baseUnit) {
      throw new NotFoundException("Unidad base del producto no encontrada");
    }

    let fromUnit = await this.unitRepo.findByCode(sourceUnitRaw.toUpperCase(), params.tx);
    if (!fromUnit && this.isUuid(sourceUnitRaw)) {
      fromUnit = await this.unitRepo.findById(sourceUnitRaw, params.tx);
    }
    if (!fromUnit) {
      const allUnits = await this.unitRepo.list(undefined, params.tx);
      const normalized = sourceUnitRaw.trim().toUpperCase();
      fromUnit = allUnits.find((unit) => unit.name.trim().toUpperCase() === normalized) ?? null;
    }
    if (!fromUnit) {
      throw new BadRequestException(`Unidad de compra invalida: ${sourceUnitRaw}`);
    }

    if (fromUnit.id === baseUnit.id) {
      return {
        factor: 1,
        unitBase: fromUnit.code,
        equivalence: `${fromUnit.code}->${baseUnit.code}`,
      };
    }

    const equivalences = await this.equivalenceRepo.listByProductId(product.id!, params.tx);
    const direct = equivalences.find(
      (row) => row.fromUnitId === fromUnit!.id && row.toUnitId === baseUnit.id,
    );
    if (direct) {
      return {
        factor: Number(direct.factor),
        unitBase: fromUnit.code,
        equivalence: `${fromUnit.code}->${baseUnit.code}`,
      };
    }

    const inverse = equivalences.find(
      (row) => row.fromUnitId === baseUnit.id && row.toUnitId === fromUnit!.id,
    );
    if (inverse && Number(inverse.factor) > 0) {
      return {
        factor: Number(inverse.factor),
        unitBase: fromUnit.code,
        equivalence: `${fromUnit.code}->${baseUnit.code}`,
      };
    }

    throw new BadRequestException(
      `No existe equivalencia para convertir ${fromUnit.code} a ${baseUnit.code} en este producto`,
    );
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
