import { Telephone } from "src/modules/clients/domain/entities/telephone";
import { TelephoneOutput } from "../dtos/telephone/output/telephone.output";

export class TelephoneOutputMapper {
  static toOutput(tel: Telephone): TelephoneOutput {
    return {
      id: tel.telephoneId.value,
      clientId: tel.clientId.value,
      number: tel.number,
      isMain: tel.isMain,
    };
  }
}
