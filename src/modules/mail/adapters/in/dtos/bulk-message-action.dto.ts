import { IsArray, IsIn, IsString } from 'class-validator';

export class BulkMessageActionDto {
  @IsArray()
  @IsString({ each: true })
  messageRecipientIds: string[];

  @IsString()
  @IsIn(['MARK_AS_READ', 'MARK_AS_UNREAD', 'DELETE', 'STAR', 'UNSTAR', 'RESTORE'])
  action: 'MARK_AS_READ' | 'MARK_AS_UNREAD' | 'DELETE' | 'STAR' | 'UNSTAR' | 'RESTORE';
}
