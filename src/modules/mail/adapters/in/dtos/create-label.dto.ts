import { IsHexColor, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsHexColor()
  color: string;
}

