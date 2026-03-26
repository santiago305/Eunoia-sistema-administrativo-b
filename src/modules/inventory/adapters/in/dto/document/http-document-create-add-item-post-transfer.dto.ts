import { Type } from 'class-transformer';
import { ArrayMinSize, Equals, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { DocType } from 'src/modules/inventory/domain/value-objects/doc-type';
import { ReferenceType } from 'src/modules/inventory/domain/value-objects/reference-type';
import { HttpAddItemTransferDto } from '../document-item/http-add-item-transfer.dto';

export class HttpCreateAddItemPostTransferDto {
  @Equals(DocType.TRANSFER, {
    message: 'Tipo de documento invalido',
  })
  docType: DocType;

  @IsUUID()
  serieId: string;

  @IsUUID()
  fromWarehouseId?: string;

  @IsUUID()
  toWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  @IsNotEmpty()
  referenceType?: ReferenceType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsNotEmpty()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HttpAddItemTransferDto)
  items: HttpAddItemTransferDto[];
}
