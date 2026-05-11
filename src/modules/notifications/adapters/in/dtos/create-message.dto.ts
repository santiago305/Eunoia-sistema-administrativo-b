import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  recipients: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  bodyHtml: string;

  @IsOptional()
  @IsString()
  originModule?: string;
}
