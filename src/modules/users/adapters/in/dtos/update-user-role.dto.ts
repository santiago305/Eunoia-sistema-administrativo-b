import { IsOptional, IsUUID } from 'class-validator';

export class UpdateUserRoleDto {
  @IsOptional()
  @IsUUID()
  roleId?: string | null;
}

