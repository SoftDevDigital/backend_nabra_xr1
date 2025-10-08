import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Correo electrónico', example: 'jane.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Contraseña', example: 'S3gura!23' })
  @IsString()
  @MinLength(6)
  password: string;
}
