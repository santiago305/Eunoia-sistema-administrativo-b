import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ExecuteMailActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(600)
  comment?: string;
}
