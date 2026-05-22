import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { HttpTelephoneReplaceDto } from "../telephone/http-telephone-replace.dto";

export class HttpCreateClientDto {
  @IsEnum(ClientType)
  type: ClientType;

  @IsString()
  fullName: string;

  @IsEnum(ClientDocType)
  docType: ClientDocType;

  @ValidateIf((o: HttpCreateClientDto) => o.docType !== ClientDocType.NONE)
  @IsString()
  @IsNotEmpty()
  docNumber?: string;

  @ValidateIf((o: HttpCreateClientDto) => o.docType === ClientDocType.NONE)
  @IsString()
  @IsNotEmpty()
  reference?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @Length(2, 2)
  departmentId: string;

  @IsString()
  @Length(4, 4)
  provinceId: string;

  @IsString()
  @Length(6, 6)
  districtId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpTelephoneReplaceDto)
  telephonesReplace?: HttpTelephoneReplaceDto[];
}
