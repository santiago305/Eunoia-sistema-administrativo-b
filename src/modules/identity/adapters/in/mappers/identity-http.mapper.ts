import { IdentityLookupMapper } from "../../../application/mappers/identity-lookup.mapper";
import { IdentityLookupQueryDto } from "../dtos/identity-lookup.dto";

export class IdentityHttpMapper {
  static toInput(dto: IdentityLookupQueryDto) {
    return IdentityLookupMapper.toInput(dto);
  }
}
