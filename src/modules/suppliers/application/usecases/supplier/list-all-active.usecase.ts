import { Inject } from "@nestjs/common";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { SupplierOutput } from "../../dtos/supplier/output/supplier.output";

export class ListAllActiveSuppliersUsecase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
  ) {}

  async execute(): Promise<SupplierOutput[]> {
    const { items } = await this.supplierRepo.listAllActive();
    return items.map((s) => ({
      supplierId: s.supplierId,
      documentType: s.documentType,
      documentNumber: s.documentNumber,
      name: s.name,
      lastName: s.lastName,
      tradeName: s.tradeName,
      address: s.address,
      phone: s.phone,
      email: s.email,
      note: s.note,
      leadTimeDays: s.leadTimeDays,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }
}
