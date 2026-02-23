import { Inject, NotFoundException } from "@nestjs/common";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { GetSupplierInput } from "../../dtos/supplier/input/get-by-id.input";
import { SupplierOutput } from "../../dtos/supplier/output/supplier.output";

export class GetSupplierUsecase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
  ) {}

  async execute(input: GetSupplierInput): Promise<SupplierOutput> {
    const supplier = await this.supplierRepo.findById(input.supplierId);
    if (!supplier) {
      throw new NotFoundException(
        {
          type: "error",
          message: "Proveedor no encontrado"
        });
    }

    return {
      supplierId: supplier.supplierId,
      documentType: supplier.documentType,
      documentNumber: supplier.documentNumber,
      name: supplier.name,
      lastName: supplier.lastName,
      tradeName: supplier.tradeName,
      address: supplier.address,
      phone: supplier.phone,
      email: supplier.email,
      note: supplier.note,
      leadTimeDays: supplier.leadTimeDays,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }
}
