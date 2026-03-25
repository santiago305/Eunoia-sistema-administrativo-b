import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class HttpUploadCompanyLogoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filePath!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;
}