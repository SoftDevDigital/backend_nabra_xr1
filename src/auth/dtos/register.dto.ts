import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Correo electrónico del usuario', example: 'jane.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Contraseña (mínimo 6 caracteres)', minLength: 6, example: 'S3gura!23' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Nombre', example: 'Jane' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Apellido', example: 'Doe' })
  @IsString()
  lastName: string;
}
