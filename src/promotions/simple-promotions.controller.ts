import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SimplePromotionsService } from './simple-promotions.service';
import { CreateProductPromotionDto } from './dtos/create-product-promotion.dto';

@ApiTags('Promociones de Productos')
@Controller('promotions')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ 
  transform: true, 
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors) => {
    const messages = errors.map(error => {
      if (error.constraints) {
        return Object.values(error.constraints).join(', ');
      }
      return `${error.property} tiene un valor inválido`;
    });
    return new BadRequestException({
      message: 'Datos de entrada inválidos',
      errors: messages,
      statusCode: 400
    });
  }
}))
export class SimplePromotionsController {
  constructor(private simplePromotionsService: SimplePromotionsService) {}

  // ===== ENDPOINTS PÚBLICOS =====

  @Public()
  @ApiOperation({ summary: 'Promociones activas', description: 'Obtiene todas las promociones activas' })
  @ApiResponse({ status: 200, description: 'Lista de promociones activas' })
  @Get('active')
  async getActivePromotions() {
    try {
      return await this.simplePromotionsService.getActivePromotions();
    } catch (error) {
      throw new BadRequestException({
        message: 'Error al obtener promociones activas',
        error: error.message,
        statusCode: 400
      });
    }
  }

  @Public()
  @ApiOperation({ summary: 'Promociones de producto', description: 'Obtiene promociones de un producto específico' })
  @ApiParam({ name: 'productId', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Promociones del producto' })
  @Get('product/:productId')
  async getProductPromotions(@Param('productId') productId: string) {
    try {
      return await this.simplePromotionsService.getPromotionsByProduct(productId);
    } catch (error) {
      throw new BadRequestException({
        message: 'Error al obtener promociones del producto',
        error: error.message,
        statusCode: 400
      });
    }
  }

  // ===== ENDPOINTS ADMINISTRATIVOS =====

  @ApiOperation({ 
    summary: 'Crear promoción para productos', 
    description: 'Crea una promoción específica para uno o más productos. Súper simple.' 
  })
  @ApiBody({ 
    type: CreateProductPromotionDto,
    description: 'Crea promociones para productos específicos',
    examples: {
      'Descuento porcentual': {
        summary: '20% de descuento en productos específicos',
        value: {
          name: 'Descuento 20%',
          type: 'percentage',
          productIds: ['68f8ddbeb378cf79481d835e', '68f8ddbeb378cf79481d835f'],
          discountPercentage: 20,
          startDate: '2025-01-21T00:00:00.000Z',
          endDate: '2025-01-31T23:59:59.000Z'
        }
      },
      'Descuento fijo': {
        summary: '$500 de descuento en productos específicos',
        value: {
          name: 'Descuento $500',
          type: 'fixed_amount',
          productIds: ['68f8ddbeb378cf79481d835e'],
          discountAmount: 500,
          startDate: '2025-01-21T00:00:00.000Z',
          endDate: '2025-01-31T23:59:59.000Z'
        }
      },
      '2x1': {
        summary: '2x1 en productos específicos',
        value: {
          name: '2x1 Especial',
          type: 'buy_x_get_y',
          productIds: ['68f8ddbeb378cf79481d835e'],
          buyQuantity: 2,
          getQuantity: 1,
          startDate: '2025-01-21T00:00:00.000Z',
          endDate: '2025-01-31T23:59:59.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Promoción creada exitosamente',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string' },
        productIds: { type: 'array', items: { type: 'string' } },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post('admin/create')
  async createPromotion(@Request() req, @Body() createPromotionDto: CreateProductPromotionDto) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException({
        message: 'Usuario no autenticado',
        statusCode: 401
      });
    }

    try {
      // Transformar DTO a formato interno
      const transformedDto = this.transformToInternalFormat(createPromotionDto);
      
      return await this.simplePromotionsService.createPromotion(transformedDto, req.user.userId);
    } catch (error) {
      throw new BadRequestException({
        message: 'Error al crear promoción',
        error: error.message,
        statusCode: 400
      });
    }
  }

  @ApiOperation({ summary: 'Listar promociones (Admin)', description: 'Lista todas las promociones' })
  @ApiResponse({ status: 200, description: 'Lista de promociones' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get('admin/all')
  async getAllPromotions(@Query() query: any) {
    try {
      return await this.simplePromotionsService.getAllPromotions(query);
    } catch (error) {
      throw new BadRequestException({
        message: 'Error al obtener promociones',
        error: error.message,
        statusCode: 400
      });
    }
  }

  @ApiOperation({ summary: 'Eliminar promoción (Admin)', description: 'Elimina una promoción' })
  @ApiParam({ name: 'id', description: 'ID de la promoción' })
  @ApiResponse({ status: 200, description: 'Promoción eliminada exitosamente' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Delete('admin/:id')
  async deletePromotion(@Param('id') id: string) {
    try {
      return await this.simplePromotionsService.deletePromotion(id);
    } catch (error) {
      throw new BadRequestException({
        message: 'Error al eliminar promoción',
        error: error.message,
        statusCode: 400
      });
    }
  }

  @ApiOperation({ summary: 'Limpiar promociones expiradas (Admin)', description: 'Elimina manualmente todas las promociones expiradas' })
  @ApiResponse({ status: 200, description: 'Promociones expiradas eliminadas' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Delete('admin/cleanup-expired')
  async cleanupExpiredPromotions() {
    try {
      return await this.simplePromotionsService.manualCleanupExpiredPromotions();
    } catch (error) {
      throw new BadRequestException({
        message: 'Error al limpiar promociones expiradas',
        error: error.message,
        statusCode: 400
      });
    }
  }

  // ===== MÉTODO DE TRANSFORMACIÓN =====

  private transformToInternalFormat(dto: CreateProductPromotionDto): any {
    return {
      name: dto.name,
      description: dto.description,
      type: dto.type,
      target: 'specific_products', // Siempre específico para productos
      startDate: dto.startDate,
      endDate: dto.endDate,
      isAutomatic: true, // Siempre automático
      isActive: dto.isActive ?? true,
      
      // Campos específicos según el tipo
      discountPercentage: dto.discountPercentage,
      discountAmount: dto.discountAmount,
      buyQuantity: dto.buyQuantity,
      getQuantity: dto.getQuantity,
      
      // Campos de aplicación - Los productos específicos
      specificProducts: dto.productIds,
      minimumPurchaseAmount: dto.minimumAmount,
      minimumQuantity: dto.minimumQuantity,
    };
  }
}