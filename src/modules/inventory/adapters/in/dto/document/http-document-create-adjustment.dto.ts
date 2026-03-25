import { Type } from 'class-transformer';
import { ArrayMinSize, Equals, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { DocType } from 'src/modules/inventory/domain/value-objects/doc-type';
import { ReferenceType } from 'src/modules/inventory/domain/value-objects/reference-type';
import { HttpCreateAddItemPostOutItemDto } from './http-document-create-add-item-post-out.dto';
import { HttpAddItemAdjustmentDto } from '../document-item/http-add-item-adjustment.dto';

export class HttpCreateDocumentAdjustmentDto {
  @Equals(DocType.ADJUSTMENT, {
    message: 'Tipo de documento invalido',
  })
  docType: DocType;

  @IsUUID()
  serieId: string;

  @IsUUID()
  fromWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  referenceType?: ReferenceType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsNotEmpty()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HttpAddItemAdjustmentDto)
  items: HttpAddItemAdjustmentDto[];
}
