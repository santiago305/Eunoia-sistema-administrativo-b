import { Inject, NotFoundException } from "@nestjs/common";
import { SUPPLIER_SKU_REPOSITORY, SupplierSkuRepository } from "src/modules/suppliers/domain/ports/supplier-sku.repository";
import { GetSupplierSkuInput } from "../../dtos/supplier-sku/input/get-by-id.input";
import { SupplierOutputMapper } from "../../mappers/supplier-output.mapper";

export class GetSupplierSkuUsecase {
  constructor(
    @Inject(SUPPLIER_SKU_REPOSITORY)
    private readonly supplierSkuRepo: SupplierSkuRepository,
  ) {}

  async execute(input: GetSupplierSkuInput) {
    const row = await this.supplierSkuRepo.findById(input.supplierId, input.skuId);
    if (!row) throw new NotFoundException("Proveedor sku no encontrado");
    return SupplierOutputMapper.toSupplierSkuOutput(row);
  }
}
