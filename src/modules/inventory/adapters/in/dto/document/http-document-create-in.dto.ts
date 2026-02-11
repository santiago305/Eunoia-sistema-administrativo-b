import { Equals, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { DocType } from 'src/modules/inventory/domain/value-objects/doc-type';

export class HttpCreateDocumentInDto {
  @Equals(DocType.IN, {
    message: 'Tipo de documento invalido',
  })
  docType: DocType;

  @IsUUID()
  serieId: string;

  @IsUUID()
  toWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  @IsNotEmpty()
  referenceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsNotEmpty()
  note?: string;
}
