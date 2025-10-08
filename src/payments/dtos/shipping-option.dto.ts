import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShippingOptionDto {
  @ApiProperty({ 
    description: 'ID del objeto de envío',
    example: '60'
  })
  @IsString()
  @IsOptional()
  ObjectId?: string;

  @ApiProperty({ 
    description: 'ID del envío',
    example: 'N6'
  })
  @IsString()
  @IsOptional()
  ShippingId?: string;

  @ApiProperty({ 
    description: 'Transportista del envío',
    example: 'estafeta'
  })
  @IsString()
  @IsOptional()
  carrier?: string;

  @ApiProperty({ 
    description: 'Servicio de envío',
    example: 'next_day'
  })
  @IsString()
  @IsOptional()
  service?: string;

  @ApiProperty({ 
    description: 'Moneda del precio de envío',
    example: 'MXN'
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ 
    description: 'Precio del envío',
    example: 135
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({ 
    description: 'Costo del seguro',
    example: 0
  })
  @IsNumber()
  @IsOptional()
  insurance?: number;

  @ApiProperty({ 
    description: 'ID del servicio',
    example: 'estafeta_mx_D-C03_next_day'
  })
  @IsString()
  @IsOptional()
  service_id?: string;

  @ApiProperty({ 
    description: 'Días de entrega estimados',
    example: '1 día'
  })
  @IsString()
  @IsOptional()
  days?: string;
}




