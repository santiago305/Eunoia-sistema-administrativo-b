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
  workflowName?: string;

  @IsOptional()
  @IsString()
  departmentName: string;
  
  @IsOptional()
  @IsString()
  provinceName: string;

  @IsOptional()
  @IsString()
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

  @IsOptional()
  @IsString()
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
  
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryCost: number;
}

