import { IsDateString } from 'class-validator';

export class ScheduleMessageDto {
  @IsDateString()
  scheduledAt: string;
}

