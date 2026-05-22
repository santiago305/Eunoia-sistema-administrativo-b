import { Client } from "src/modules/clients/domain/entities/client";
import { ClientOutput } from "../dtos/client/output/client.output";

export class ClientOutputMapper {
  static toOutput(client: Client): ClientOutput {
    return {
      id: client.clientId.value,
      type: client.type,
      fullName: client.fullName,
      docType: client.docType,
      docNumber: client.docNumber,
      reference: client.reference,
      address: client.address,
      departmentId: client.departmentId.value,
      provinceId: client.provinceId.value,
      districtId: client.districtId.value,
      isActive: client.isActive,
    };
  }
}
