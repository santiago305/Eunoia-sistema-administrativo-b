import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class DeactivateRoleDto {
  @IsUUID()
  @IsNotEmpty()
  replacementRoleId: string;

  @IsString()
  @IsNotEmpty()
  confirmationText: string;
}

