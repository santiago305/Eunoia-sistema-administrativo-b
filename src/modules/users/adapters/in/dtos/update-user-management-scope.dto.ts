import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateUserManagementScopeDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  manageableRoleDescriptions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  manageableUserIds?: string[];
}

