import {
  IsEnum,
  IsNumberString,
  IsString,
  Length,
  MinLength,
  ValidateIf,
} from "class-validator";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

export class IdentityLookupQueryDto {
  @IsEnum(SupplierDocType)
  documentType: SupplierDocType;

  @ValidateIf((o) => o.documentType === SupplierDocType.DNI)
  @IsNumberString()
  @Length(8, 8)
  @ValidateIf((o) => o.documentType === SupplierDocType.RUC)
  @IsNumberString()
  @Length(11, 11)
  @ValidateIf((o) => o.documentType === SupplierDocType.CE)
  @IsString()
  @MinLength(1)
  documentNumber: string;
}
