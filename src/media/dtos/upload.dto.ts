import { IsString, IsIn, IsUrl } from 'class-validator';

export class UploadDto {
  @IsString()
  @IsIn(['product', 'cover'])
  type: string;

  @IsString()
  @IsUrl()
  url: string;
}
