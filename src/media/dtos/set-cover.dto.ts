import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetCoverDto {
  @ApiProperty({ 
    description: 'URL de la imagen de portada (opcional si se proporciona archivo)', 
    required: false,
    example: 'https://example.com/cover-image.jpg'
  })
  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  url?: string;

  @ApiProperty({ 
    description: 'Archivo de imagen de portada (opcional si se proporciona URL)', 
    type: 'string', 
    format: 'binary',
    required: false
  })
  @IsOptional()
  file?: Express.Multer.File;
}
