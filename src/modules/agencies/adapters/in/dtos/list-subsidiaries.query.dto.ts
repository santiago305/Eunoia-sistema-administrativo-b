import { IsBooleanString, IsOptional, IsString, IsUUID } from "class-validator";

export class ListSubsidiariesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  agencyId?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}
