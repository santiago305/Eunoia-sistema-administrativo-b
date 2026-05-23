import { IsArray, IsString, IsUUID } from 'class-validator';

export class BulkDeleteMailFilesDto {
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  attachmentIds: string[];
}

