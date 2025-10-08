import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, Matches, MinLength, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ 
    example: 'Casa Principal', 
    description: 'Nombre descriptivo para identificar la dirección (ej: Casa, Oficina, Casa de mamá)' 
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({ 
    example: 'Callejón 6 de Mayo 150', 
    description: 'Calle y número de la dirección' 
  })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  street: string;

  @ApiProperty({ 
    example: 'Col. La Tijera', 
    description: 'Colonia, fraccionamiento o referencia adicional (opcional)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  street2?: string;

  @ApiProperty({ 
    example: 'Tlajomulco de Zúñiga', 
    description: 'Ciudad o municipio' 
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  city: string;

  @ApiProperty({ 
    example: 'Jalisco', 
    description: 'Estado' 
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  state: string;

  @ApiProperty({ 
    example: '45646', 
    description: 'Código postal (5 dígitos)' 
  })
  @IsString()
  @Matches(/^\d{5}$/, { message: 'El código postal debe tener exactamente 5 dígitos' })
  postalCode: string;

  @ApiProperty({ 
    example: 'México', 
    description: 'País', 
    default: 'México' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  country?: string;

  @ApiProperty({ 
    example: 'Juan Pérez', 
    description: 'Nombre completo de quien recibe el paquete' 
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactName: string;

  @ApiProperty({ 
    example: '3312345678', 
    description: 'Número de teléfono de contacto (10 dígitos)' 
  })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'El teléfono debe tener exactamente 10 dígitos' })
  contactPhone: string;

  @ApiProperty({ 
    example: 'Dejar en recepción, llamar antes de entregar', 
    description: 'Instrucciones especiales de entrega (opcional)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instructions?: string;

  @ApiProperty({ 
    example: false, 
    description: 'Si esta dirección debe ser la principal por defecto', 
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ 
    example: true, 
    description: 'Si desea guardar esta dirección para futuros envíos', 
    default: true 
  })
  @IsOptional()
  @IsBoolean()
  saveAddress?: boolean;
}

export class UpdateAddressDto {
  @ApiProperty({ 
    example: 'Casa Principal Actualizada', 
    description: 'Nombre descriptivo para identificar la dirección', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiProperty({ 
    example: 'Callejón 6 de Mayo 150', 
    description: 'Calle y número de la dirección', 
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
    description: 'Ciudad o municipio', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  city?: string;

  @ApiProperty({ 
    example: 'Jalisco', 
    description: 'Estado', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  state?: string;

  @ApiProperty({ 
    example: '45646', 
    description: 'Código postal (5 dígitos)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'El código postal debe tener exactamente 5 dígitos' })
  postalCode?: string;

  @ApiProperty({ 
    example: 'México', 
    description: 'País', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  country?: string;

  @ApiProperty({ 
    example: 'Juan Pérez', 
    description: 'Nombre completo de quien recibe el paquete', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactName?: string;

  @ApiProperty({ 
    example: '3312345678', 
    description: 'Número de teléfono de contacto (10 dígitos)', 
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
    description: 'Si esta dirección debe ser la principal por defecto', 
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class SelectAddressDto {
  @ApiProperty({ 
    example: '507f1f77bcf86cd799439011', 
    description: 'ID de la dirección guardada a seleccionar' 
  })
  @IsString()
  addressId: string;
}

export class AddressResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ example: 'Casa Principal' })
  name: string;

  @ApiProperty({ example: 'Callejón 6 de Mayo 150' })
  street: string;

  @ApiProperty({ example: 'Col. La Tijera', required: false })
  street2?: string;

  @ApiProperty({ example: 'Tlajomulco de Zúñiga' })
  city: string;

  @ApiProperty({ example: 'Jalisco' })
  state: string;

  @ApiProperty({ example: '45646' })
  postalCode: string;

  @ApiProperty({ example: 'México' })
  country: string;

  @ApiProperty({ example: 'Juan Pérez' })
  contactName: string;

  @ApiProperty({ example: '3312345678' })
  contactPhone: string;

  @ApiProperty({ example: 'Dejar en recepción', required: false })
  instructions?: string;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}
