import { IsString, IsOptional, IsNumber } from 'class-validator';

export class PaymentResponseDto {
  @IsString()
  id: string;

  @IsString()
  status: string;

  @IsString()
  @IsOptional()
  approvalUrl?: string;

  @IsString()
  @IsOptional()
  error?: string;
}

export class PaymentCaptureDto {
  @IsString()
  paymentId: string;

  @IsString()
  @IsOptional()
  payerId?: string;
}



