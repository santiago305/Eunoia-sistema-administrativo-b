import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, Matches } from "class-validator";

export class HttpDashboardSaleOrdersUbigeoQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, {
    message: "month must use YYYY-MM format",
  })
  month?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  cancelBool?: boolean;
}
