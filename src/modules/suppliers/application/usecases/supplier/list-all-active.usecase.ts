import { Inject } from "@nestjs/common";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { SupplierOutput } from "../../dtos/supplier/output/supplier.output";
import { SupplierOutputMapper } from "../../mappers/supplier-output.mapper";

export class ListAllActiveSuppliersUsecase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
  ) {}

  async execute(): Promise<SupplierOutput[]> {
    const { items } = await this.supplierRepo.listAllActive();
    return items.map((supplier) => SupplierOutputMapper.toSupplierOutput(supplier));
  }
}
