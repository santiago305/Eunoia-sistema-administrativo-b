import { IsISO8601, IsString } from 'class-validator';

export class SnoozeMessageDto {
  @IsString()
  @IsISO8601()
  snoozedUntil: string;
}
