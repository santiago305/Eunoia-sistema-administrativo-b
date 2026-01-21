import { 
  IsString, 
  IsNotEmpty, 
  Matches, 
  Length
} from 'class-validator';
export class CreateRoleDto {
  /**
   * DescripciAn del rol (por ejemplo: "admin", "user").
   *
   * @type {string}
   * @validation
   * - Debe ser una cadena (`string`).
   * - No puede estar vacAa.
   */
  @IsString()
  @IsNotEmpty({ message: 'La descripcion no puede estar vacia' })
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'La descripcion solo debe contener letras y espacios',
  })
  @Length(3, 30, {
    message: 'La descripcion debe tener entre 3 y 30 caracteres',
  })
  description: string;
  
}

