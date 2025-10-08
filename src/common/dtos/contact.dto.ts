import { IsString, IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactDto {
  @ApiProperty({ 
    description: 'Nombre completo de la persona que contacta',
    example: 'Juan Pérez',
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ 
    description: 'Correo electrónico de contacto',
    example: 'juan@ejemplo.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: 'Número de teléfono',
    example: '+52 55 1234 5678',
    maxLength: 20
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ 
    description: 'Comentario o mensaje',
    example: 'Hola, me interesa saber más sobre sus productos...',
    maxLength: 1000
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment: string;
}
