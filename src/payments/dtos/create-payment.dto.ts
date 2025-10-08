import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentItemDto {
  @ApiProperty({ description: 'Nombre del item', example: 'Zapatillas Modelo X' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descripción del item', example: 'Color negro, talle 42', required: false })
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Cantidad', example: 2, minimum: 1 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Precio unitario', example: 54999.99, minimum: 0 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ description: 'Moneda', example: 'MXN', required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'ID de la orden interna', example: '64f1c2ab9f1b2a6c0e7a1234' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Descripción del pago', example: 'Compra Nabra #1234', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Listado de items', type: [PaymentItemDto], example: [
    { name: 'Zapatillas Modelo X', description: 'Talle 42', quantity: 1, price: 54999.99, currency: 'MXN' },
    { name: 'Medias deportivas', quantity: 2, price: 2999.5, currency: 'MXN' }
  ] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items: PaymentItemDto[];

  @ApiProperty({ description: 'Importe total', example: 60998.99 })
  @IsNumber()
  @IsPositive()
  totalAmount: number;

  @ApiProperty({ description: 'Moneda', example: 'MXN', required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiProperty({ description: 'URL de retorno en éxito', example: 'https://frontend.example.com/pagos/success' , required: false })
  @IsString()
  @IsOptional()
  returnUrl?: string;

  @ApiProperty({ description: 'URL de retorno en cancelación', example: 'https://frontend.example.com/pagos/cancel', required: false })
  @IsString()
  @IsOptional()
  cancelUrl?: string;
}



