import { SupplierDocType } from "../object-values/supplier-doc-type";
import { InvalidSupplierError } from "../errors/invalid-supplier.error";
import { SupplierDomainService } from "../services/supplier-domain.service";

export class Supplier {
  private constructor(
    public readonly supplierId: string,
    public readonly documentType: SupplierDocType,
    public readonly documentNumber: string,
    public readonly name?: string,
    public readonly lastName?: string,
    public readonly tradeName?: string,
    public readonly address?: string,
    public readonly phone?: string,
    public readonly email?: string,
    public readonly note?: string,
    public readonly leadTimeDays?: number,
    public readonly isActive: boolean = true,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(params: {
    supplierId?: string;
    documentType: SupplierDocType;
    documentNumber: string;
    name?: string;
    lastName?: string;
    tradeName?: string;
    address?: string;
    phone?: string;
    email?: string;
    note?: string;
    leadTimeDays?: number;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const documentNumber = params.documentNumber.trim();
    if (!documentNumber) {
      throw new InvalidSupplierError("El numero de documento es invalido");
    }
    if (params.leadTimeDays !== undefined && params.leadTimeDays < 0) {
      throw new InvalidSupplierError("El tiempo de entrega es invalido");
    }

    return new Supplier(
      params.supplierId,
      params.documentType,
      documentNumber,
      SupplierDomainService.normalizeOptionalText(params.name),
      SupplierDomainService.normalizeOptionalText(params.lastName),
      SupplierDomainService.normalizeOptionalText(params.tradeName),
      SupplierDomainService.normalizeOptionalText(params.address),
      SupplierDomainService.normalizeOptionalText(params.phone),
      SupplierDomainService.normalizeOptionalText(params.email),
      SupplierDomainService.normalizeOptionalText(params.note),
      params.leadTimeDays,
      params.isActive ?? true,
      params.createdAt,
      params.updatedAt,
    );
  }

  update(params: {
    documentType?: SupplierDocType;
    documentNumber?: string;
    name?: string;
    lastName?: string;
    tradeName?: string;
    address?: string;
    phone?: string;
    email?: string;
    note?: string;
    leadTimeDays?: number;
    isActive?: boolean;
    updatedAt?: Date;
  }) {
    return Supplier.create({
      supplierId: this.supplierId,
      documentType: params.documentType ?? this.documentType,
      documentNumber: params.documentNumber ?? this.documentNumber,
      name: params.name ?? this.name,
      lastName: params.lastName ?? this.lastName,
      tradeName: params.tradeName ?? this.tradeName,
      address: params.address ?? this.address,
      phone: params.phone ?? this.phone,
      email: params.email ?? this.email,
      note: params.note ?? this.note,
      leadTimeDays: params.leadTimeDays ?? this.leadTimeDays,
      isActive: params.isActive ?? this.isActive,
      createdAt: this.createdAt,
      updatedAt: params.updatedAt ?? this.updatedAt,
    });
  }
}
