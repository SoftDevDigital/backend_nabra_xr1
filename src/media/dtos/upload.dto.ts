import { IsString, IsIn, IsUrl, IsOptional } from 'class-validator';

export class UploadDto {
  @IsString()
  @IsIn(['product', 'cover'])
  type: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  url?: string; // Opcional porque en upload de archivo no se usa
}
