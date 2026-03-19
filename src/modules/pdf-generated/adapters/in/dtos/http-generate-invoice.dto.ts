import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

class InvoiceCompanyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  ruc?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}

class InvoiceClientDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  document?: string;
}

class InvoiceDocumentDto {
  @IsString()
  type: string;

  @IsString()
  serie: string;

  @IsString()
  number: string;

  @Type(() => Date)
  @IsDate()
  issuedAt: Date;

  @IsString()
  currency: string;
}

class InvoiceItemDto {
  @IsString()
  description: string;

  @IsString()
  unit: string;

  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  unitPrice: number;

  @Type(() => Number)
  @IsNumber()
  total: number;
}

class InvoiceTotalsDto {
  @Type(() => Number)
  @IsNumber()
  taxed: number;

  @Type(() => Number)
  @IsNumber()
  igv: number;

  @Type(() => Number)
  @IsNumber()
  total: number;

  @Type(() => Number)
  @IsNumber()
  igvPercentage: number;

  @IsOptional()
  @IsString()
  legend?: string;

  @IsOptional()
  @IsString()
  additionalInfo?: string;
}

export class HttpGenerateInvoiceDto {
  @ValidateNested()
  @Type(() => InvoiceCompanyDto)
  company: InvoiceCompanyDto;

  @ValidateNested()
  @Type(() => InvoiceClientDto)
  client: InvoiceClientDto;

  @ValidateNested()
  @Type(() => InvoiceDocumentDto)
  document: InvoiceDocumentDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ValidateNested()
  @Type(() => InvoiceTotalsDto)
  totals: InvoiceTotalsDto;
}
