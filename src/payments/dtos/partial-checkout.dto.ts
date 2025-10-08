import { IsArray, IsMongoId, IsInt, Min, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PartialCartItemDto {
  @ApiProperty({ description: 'ID del item del carrito', example: '6501b5f2c9b1a2d34f0a1234' })
  @IsMongoId()
  itemId: string;

  @ApiProperty({ description: 'Cantidad a pagar', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class PartialCheckoutDto {
  @ApiProperty({ description: 'Items seleccionados a pagar', type: [PartialCartItemDto], example: [ { itemId: '6501b5f2c9b1a2d34f0a1234', quantity: 1 } ] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartialCartItemDto)
  items: PartialCartItemDto[];

  @ApiProperty({ description: 'URL de retorno en éxito', required: false, example: 'https://frontend.example.com/pagos/success' })
  @IsOptional()
  returnUrl?: string;

  @ApiProperty({ description: 'URL de retorno en cancelación', required: false, example: 'https://frontend.example.com/pagos/cancel' })
  @IsOptional()
  cancelUrl?: string;
}
