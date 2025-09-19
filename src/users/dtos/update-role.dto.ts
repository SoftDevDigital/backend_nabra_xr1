import { IsString, IsIn } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsIn(['user', 'admin'])
  role: string;
}
