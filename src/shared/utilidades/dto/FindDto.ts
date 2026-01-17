import { IsUUID } from 'class-validator';

export class FindDto {
  @IsUUID('4', { message: 'El ID debe ser un UUID vAlido' })
  id: string;
}

