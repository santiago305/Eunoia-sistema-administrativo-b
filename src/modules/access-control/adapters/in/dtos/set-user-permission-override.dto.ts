import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum UserPermissionEffectDto {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
}

export class SetUserPermissionOverrideDto {
  @IsString()
  permissionCode: string;

  @IsEnum(UserPermissionEffectDto)
  effect: UserPermissionEffectDto;

  @IsOptional()
  @IsString()
  reason?: string;
}

