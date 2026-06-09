import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from "class-validator";
import {
  HttpSaleOrderSearchRuleDto,
  toSaleOrderFiltersArray,
} from "./http-sale-order-list.dto";

export class HttpSaleOrderStatisticsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => toSaleOrderFiltersArray(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpSaleOrderSearchRuleDto)
  filters?: HttpSaleOrderSearchRuleDto[];

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  includeCancelled?: boolean;
}
