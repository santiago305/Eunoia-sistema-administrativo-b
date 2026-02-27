import {
  IsEnum,
} from "class-validator";
import { IsValidDocumentNumber } from "src/modules/suppliers/adapters/in/dtos/document-number.validator";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

export class IdentityLookupQueryDto {
  @IsEnum(SupplierDocType)
  documentType: SupplierDocType;

  @IsValidDocumentNumber()
  documentNumber: string;
}
