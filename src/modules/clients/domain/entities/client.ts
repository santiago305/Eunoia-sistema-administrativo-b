import { randomUUID } from "crypto";
import { ClientDocType } from "../object-values/client-doc-type";
import { ClientType } from "../object-values/client-type";
import { InvalidClientError } from "../errors/invalid-client.error";
import { ClientDomainService } from "../services/client-domain.service";
import { ClientId } from "../value-objects/client-id.vo";
import { UbigeoDepartmentId } from "../value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "../value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "../value-objects/ubigeo-district-id.vo";

export class Client {
  private constructor(
    public readonly clientId: ClientId,
    public readonly type: ClientType,
    public readonly fullName: string,
    public readonly docType: ClientDocType,
    public readonly docNumber: string,
    public readonly departmentId: UbigeoDepartmentId,
    public readonly provinceId: UbigeoProvinceId,
    public readonly districtId: UbigeoDistrictId,
    public readonly reference?: string,
    public readonly address?: string,
    public readonly isActive: boolean = true,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(params: {
    clientId?: ClientId;
    type: ClientType;
    fullName: string;
    docType: ClientDocType;
    docNumber: string;
    departmentId: UbigeoDepartmentId;
    provinceId: UbigeoProvinceId;
    districtId: UbigeoDistrictId;
    reference?: string;
    address?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const fullName = params.fullName?.trim();
    const docNumber = params.docType === ClientDocType.NONE ? "" : params.docNumber?.trim();
    const reference = ClientDomainService.normalizeOptionalText(params.reference);

    if (!fullName) {
      throw new InvalidClientError("El nombre completo es invalido");
    }

    if (params.docType != ClientDocType.NONE) {
      if (!docNumber) {
        throw new InvalidClientError("El numero de documento es invalido");
      }
    } 

    return new Client(
      params.clientId ?? new ClientId(randomUUID()),
      params.type,
      fullName,
      params.docType,
      docNumber ?? "",
      params.departmentId,
      params.provinceId,
      params.districtId,
      reference,
      ClientDomainService.normalizeOptionalText(params.address),
      params.isActive ?? true,
      params.createdAt,
      params.updatedAt,
    );
  }

  update(params: {
    type?: ClientType;
    fullName?: string;
    docType?: ClientDocType;
    docNumber?: string;
    departmentId?: UbigeoDepartmentId;
    provinceId?: UbigeoProvinceId;
    districtId?: UbigeoDistrictId;
    reference?: string;
    address?: string;
    isActive?: boolean;
    updatedAt?: Date;
  }) {
    return Client.create({
      clientId: this.clientId,
      type: params.type ?? this.type,
      fullName: params.fullName ?? this.fullName,
      docType: params.docType ?? this.docType,
      docNumber: params.docNumber ?? this.docNumber,
      departmentId: params.departmentId ?? this.departmentId,
      provinceId: params.provinceId ?? this.provinceId,
      districtId: params.districtId ?? this.districtId,
      reference: params.reference ?? this.reference,
      address: params.address ?? this.address,
      isActive: params.isActive ?? this.isActive,
      createdAt: this.createdAt,
      updatedAt: params.updatedAt ?? this.updatedAt,
    });
  }
}
