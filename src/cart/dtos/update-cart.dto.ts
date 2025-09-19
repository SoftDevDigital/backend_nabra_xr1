import { IsMongoId, IsInt, Min, IsString, IsOptional } from 'class-validator';

export class UpdateCartDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  size?: string;
}
