import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateUserRoleDto {
  @IsUUID()
  @IsNotEmpty()
  roleId: string;
}

