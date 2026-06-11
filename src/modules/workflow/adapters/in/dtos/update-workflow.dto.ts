import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  code: string;
  
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
