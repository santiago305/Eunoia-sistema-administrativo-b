import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class HttpUploadCompanyCertDto {
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