import { IsString, IsIn } from 'class-validator';

export class UploadDto {
  @IsString()
  @IsIn(['product', 'cover'])
  type: string;
}
