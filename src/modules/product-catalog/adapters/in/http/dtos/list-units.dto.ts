import { IsOptional, IsString } from "class-validator";

export class ListProductCatalogUnitsDto {
  @IsOptional()
  @IsString()
  q?: string;
}
