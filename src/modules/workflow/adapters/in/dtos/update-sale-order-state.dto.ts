import { IsOptional, IsString } from "class-validator";

export class UpdateSaleOrderStateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
