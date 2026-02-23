import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { ListSuppliersInput } from "../../dtos/supplier/input/list.input";
import { SupplierOutput } from "../../dtos/supplier/output/supplier.output";

export class ListSuppliersUsecase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
  ) {}

  async execute(input: ListSuppliersInput): Promise<PaginatedResult<SupplierOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.supplierRepo.list({
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      name: input.name,
      lastName: input.lastName,
      tradeName: input.tradeName,
      phone: input.phone,
      email: input.email,
      q: input.q,
      isActive: input.isActive,
      page,
      limit,
    });

    return {
      items: items.map((s) => ({
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
      })),
      total,
      page,
      limit,
    };
  }
}
