import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, ValidateNested, MinLength, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutAddressDto {
  @ApiProperty({ 
    example: '507f1f77bcf86cd799439011', 
    description: 'ID de dirección guardada (opcional si se proporciona nueva dirección)',
    required: false
  })
  @IsOptional()
  @IsString()
  savedAddressId?: string;

  @ApiProperty({ 
    example: 'Casa Principal', 
    description: 'Nombre descriptivo para la dirección (solo si es nueva)',
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiProperty({ 
    example: 'Callejón 6 de Mayo 150', 
    description: 'Calle y número de la dirección (requerido si no se usa dirección guardada)',
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  street?: string;

  @ApiProperty({ 
    example: 'Col. La Tijera', 
    description: 'Colonia, fraccionamiento o referencia adicional',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  street2?: string;

  @ApiProperty({ 
    example: 'Tlajomulco de Zúñiga', 
    description: 'Ciudad o municipio (requerido si no se usa dirección guardada)',
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  city?: string;

  @ApiProperty({ 
    example: 'Jalisco', 
    description: 'Estado (requerido si no se usa dirección guardada)',
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  state?: string;

  @ApiProperty({ 
    example: '45646', 
    description: 'Código postal (requerido si no se usa dirección guardada)',
    required: false
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'El código postal debe tener exactamente 5 dígitos' })
  postalCode?: string;

  @ApiProperty({ 
    example: 'México', 
    description: 'País',
    required: false,
    default: 'México'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  country?: string;

  @ApiProperty({ 
    example: 'Juan Pérez', 
    description: 'Nombre completo de quien recibe el paquete (requerido si no se usa dirección guardada)',
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactName?: string;

  @ApiProperty({ 
    example: '3312345678', 
    description: 'Número de teléfono de contacto (requerido si no se usa dirección guardada)',
    required: false
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'El teléfono debe tener exactamente 10 dígitos' })
  contactPhone?: string;

  @ApiProperty({ 
    example: 'Dejar en recepción, llamar antes de entregar', 
    description: 'Instrucciones especiales de entrega',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instructions?: string;

  @ApiProperty({ 
    example: true, 
    description: 'Si desea guardar esta nueva dirección para futuros envíos',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  saveAddress?: boolean;
}

export class CheckoutRequestDto {
  @ApiProperty({ 
    description: 'Datos de la dirección de envío',
    type: CheckoutAddressDto
  })
  @ValidateNested()
  @Type(() => CheckoutAddressDto)
  shippingAddress: CheckoutAddressDto;

  @ApiProperty({ 
    example: 'paypal', 
    description: 'Método de pago seleccionado',
    enum: ['paypal', 'mercadopago']
  })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ 
    example: 'CUPON10', 
    description: 'Código de cupón de descuento (opcional)',
    required: false
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({ 
    example: 'Envío express', 
    description: 'Notas adicionales para el pedido',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
