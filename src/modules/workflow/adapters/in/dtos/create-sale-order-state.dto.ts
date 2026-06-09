import { IsString } from "class-validator";

export class CreateSaleOrderStateDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  color: string;
}
