import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetUserGrantablePermissionsDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  permissionCodes?: string[];
}
