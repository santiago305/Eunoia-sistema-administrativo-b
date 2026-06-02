import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class HttpSaleOrderImportPreviewRowDto {
  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  orderDate?: string;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  deliveryType?: string;

  @IsString()
  @IsNotEmpty()
  departmentName: string;

  @IsString()
  @IsNotEmpty()
  provinceName: string;

  @IsString()
  @IsNotEmpty()
  districtName: string;

  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  deliveryNote?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsString()
  @IsNotEmpty()
  productCodes: string;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  quantity?: number;

  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  advance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  codAmount?: number;

  @IsOptional()
  @IsString()
  internalNote?: string;

  @IsOptional()
  @IsString()
  confirmedBy?: string;
}

