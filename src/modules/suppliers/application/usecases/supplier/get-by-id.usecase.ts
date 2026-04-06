import { Inject, NotFoundException } from "@nestjs/common";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { GetSupplierInput } from "../../dtos/supplier/input/get-by-id.input";
import { SupplierOutput } from "../../dtos/supplier/output/supplier.output";
import { SupplierOutputMapper } from "../../mappers/supplier-output.mapper";
import { SupplierNotFoundError } from "../../errors/supplier-not-found.error";

export class GetSupplierUsecase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
  ) {}

  async execute(input: GetSupplierInput): Promise<SupplierOutput> {
    const supplier = await this.supplierRepo.findById(input.supplierId);
    if (!supplier) {
      throw new NotFoundException(new SupplierNotFoundError().message);
    }

    return SupplierOutputMapper.toSupplierOutput(supplier);
  }
}
