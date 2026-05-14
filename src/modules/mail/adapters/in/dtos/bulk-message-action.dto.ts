import { IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class BulkMessageActionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  messageRecipientIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  messageStateIds?: string[];

  @IsString()
  @IsIn([
    'MARK_AS_READ',
    'MARK_AS_UNREAD',
    'DELETE',
    'STAR',
    'UNSTAR',
    'RESTORE',
    'ARCHIVE',
    'UNARCHIVE',
    'SNOOZE',
    'UNSNOOZE',
    'MOVE_TO_TRASH',
    'ASSIGN_LABEL',
    'REMOVE_LABEL',
  ])
  action:
    | 'MARK_AS_READ'
    | 'MARK_AS_UNREAD'
    | 'DELETE'
    | 'STAR'
    | 'UNSTAR'
    | 'RESTORE'
    | 'ARCHIVE'
    | 'UNARCHIVE'
    | 'SNOOZE'
    | 'UNSNOOZE'
    | 'MOVE_TO_TRASH'
    | 'ASSIGN_LABEL'
    | 'REMOVE_LABEL';

  @IsOptional()
  @IsString()
  snoozedUntil?: string;

  @IsOptional()
  @IsUUID('4')
  labelId?: string;
}
