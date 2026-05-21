import { Client } from "../entities/client";
import { Telephone } from "../entities/telephone";
import { ClientDocType } from "../object-values/client-doc-type";
import { ClientType } from "../object-values/client-type";
import { ClientId } from "../value-objects/client-id.vo";
import { TelephoneId } from "../value-objects/telephone-id.vo";
import { UbigeoDepartmentId } from "../value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "../value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "../value-objects/ubigeo-district-id.vo";

export class ClientFactory {
  static createClient(params: {
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
    return Client.create(params);
  }

  static createTelephone(params: {
    telephoneId?: TelephoneId;
    clientId: ClientId;
    number: string;
    isMain?: boolean;
  }) {
    return Telephone.create(params);
  }
}
