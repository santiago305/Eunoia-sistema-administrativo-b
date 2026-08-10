import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

class WorkflowSupplyRecipeItemDto {
  @IsUUID()
  supplySkuId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsUUID()
  unitId: string;
}

export class SaveWorkflowSupplyRecipeDto {
  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => WorkflowSupplyRecipeItemDto)
  items: WorkflowSupplyRecipeItemDto[];
}
