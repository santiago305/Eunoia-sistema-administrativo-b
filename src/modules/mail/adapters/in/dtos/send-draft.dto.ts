import { IsNotEmpty, IsString } from 'class-validator';

export class SendDraftDto {
  @IsString()
  @IsNotEmpty()
  recipients: string;
}
