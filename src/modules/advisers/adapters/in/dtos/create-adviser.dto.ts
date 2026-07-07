import { IsUUID } from 'class-validator';

export class CreateAdviserDto {
  @IsUUID()
  userId: string;
}
