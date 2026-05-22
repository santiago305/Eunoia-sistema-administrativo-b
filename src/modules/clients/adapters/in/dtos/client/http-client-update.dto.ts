import { Type } from "class-transformer";
import {
  IsArray,
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

export class HttpUpdateClientDto {
  @IsOptional()
  @IsEnum(ClientType)
  type?: ClientType;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(ClientDocType)
  docType?: ClientDocType;

  @ValidateIf((o: HttpUpdateClientDto) => o.docType !== undefined && o.docType !== ClientDocType.NONE)
  @IsString()
  @IsNotEmpty()
  docNumber?: string;

  @ValidateIf((o: HttpUpdateClientDto) => o.docType === ClientDocType.NONE)
  @IsString()
  @IsNotEmpty()
  reference?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  departmentId?: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  provinceId?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  districtId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpTelephoneReplaceDto)
  telephonesReplace?: HttpTelephoneReplaceDto[];
}
