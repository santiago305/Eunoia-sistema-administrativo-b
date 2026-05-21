import { IsOptional, IsUUID } from 'class-validator';

export class ListMailActionsQueryDto {
  @IsOptional()
  @IsUUID()
  threadId?: string;

  @IsOptional()
  @IsUUID()
  messageId?: string;
}
