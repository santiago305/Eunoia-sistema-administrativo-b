import { IsOptional, IsString, MaxLength } from 'class-validator';

export class HttpPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
