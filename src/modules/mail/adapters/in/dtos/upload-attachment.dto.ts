import { IsOptional, IsUUID } from 'class-validator';

export class UploadAttachmentDto {
  @IsOptional()
  @IsUUID('4')
  messageId?: string;

  @IsOptional()
  @IsUUID('4')
  draftId?: string;
}
