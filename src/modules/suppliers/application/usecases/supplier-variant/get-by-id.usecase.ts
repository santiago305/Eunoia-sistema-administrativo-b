import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { SUPPLIER_VARIANT_REPOSITORY, SupplierVariantRepository } from "src/modules/suppliers/domain/ports/supplier-variant.repository";
import { GetSupplierVariantInput } from "../../dtos/supplier-variant/input/get-by-id.input";
import { SupplierVariantOutput } from "../../dtos/supplier-variant/output/supplier-variant.output";

export class GetSupplierVariantUsecase {
  constructor(
    @Inject(SUPPLIER_VARIANT_REPOSITORY)
    private readonly supplierVariantRepo: SupplierVariantRepository,
  ) {}

  async execute(input: GetSupplierVariantInput): Promise<SupplierVariantOutput> {
    const row = await this.supplierVariantRepo.findById(input.supplierId, input.variantId);
    if (!row) {
      throw new NotFoundException({
        type: "error",
        message: "Relacion proveedor-variante no encontrada"
      });
    }

    return {
      supplierId: row.supplierId,
      variantId: row.variantId,
      supplierSku: row.supplierSku,
      lastCost: row.lastCost?.getAmount(),
      leadTimeDays: row.leadTimeDays,
    };
  }
}
