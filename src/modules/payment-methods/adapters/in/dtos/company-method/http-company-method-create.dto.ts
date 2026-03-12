import { IsNotEmpty, IsUUID } from "class-validator";

export class HttpCompanyMethodCreateDto {
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @IsUUID()
  @IsNotEmpty()
  methodId: string;
}
