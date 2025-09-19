import { IsEnum } from 'class-validator';

export class UpdateStatusDto {
  @IsEnum(['pending', 'paid', 'shipped', 'delivered', 'cancelled'], {
    message: 'Invalid status',
  })
  status: string;
}
