import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class HttpCreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class HttpUpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class HttpSetProductActiveDto {
  @IsBoolean()
  isActive: boolean;
}
