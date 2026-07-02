import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, Matches, ValidateNested } from "class-validator";
import {
  HttpSaleOrderSearchRuleDto,
  toSaleOrderFiltersArray,
} from "src/modules/sale-orders/adapters/in/dtos/http-sale-order-list.dto";

export class HttpDashboardSaleOrdersUbigeoQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, {
    message: "month must use YYYY-MM format",
  })
  month?: string;

  @IsOptional()
  @Transform(({ value }) => toSaleOrderFiltersArray(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpSaleOrderSearchRuleDto)
  filters?: HttpSaleOrderSearchRuleDto[];

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  cancelBool?: boolean;
}
