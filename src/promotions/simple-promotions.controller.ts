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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SimplePromotionsService } from './simple-promotions.service';
import { 
  CreateSimplePromotionDto, 
  ApplyPromotionDto, 
  CreateSimpleCouponDto,
  SimplePromotionType 
} from './dtos/simple-promotion.dto';

@ApiTags('Simple Promotions')
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

  @ApiOperation({ summary: 'Obtener promociones activas', description: 'Lista todas las promociones activas disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de promociones activas' })
  @Public()
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

  @ApiOperation({ summary: 'Obtener promociones por producto', description: 'Busca promociones aplicables a un producto específico' })
  @ApiResponse({ status: 200, description: 'Lista de promociones para el producto' })
  @Public()
  @Get('product/:productId')
  async getPromotionsByProduct(@Param('productId') productId: string) {
    if (!productId || productId.trim().length === 0) {
      throw new BadRequestException({
        message: 'ID de producto requerido',
        statusCode: 400
      });
    }

    try {
      return await this.simplePromotionsService.getPromotionsByProduct(productId);
    } catch (error) {
      throw new BadRequestException({
        message: `Error al obtener promociones para el producto ${productId}`,
        error: error.message,
        statusCode: 400
      });
    }
  }

  @ApiOperation({ summary: 'Validar cupón', description: 'Valida un cupón antes de aplicarlo' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      required: ['couponCode'],
      properties: { 
        couponCode: { type: 'string', example: 'DESCUENTO50' },
        userId: { type: 'string', example: '64f...' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Resultado de la validación del cupón' })
  @Public()
  @Post('validate-coupon')
  async validateCoupon(@Body() body: { couponCode: string; userId?: string }) {
    if (!body.couponCode || body.couponCode.trim().length === 0) {
      throw new BadRequestException({
        message: 'Código de cupón requerido',
        statusCode: 400
      });
    }

    try {
      return await this.simplePromotionsService.validateCoupon(body.couponCode, body.userId);
    } catch (error) {
      throw new BadRequestException({
        message: `Error al validar cupón: ${body.couponCode}`,
        error: error.message,
        statusCode: 400
      });
    }
  }

  // ===== ENDPOINTS DE USUARIO =====

  @ApiOperation({ summary: 'Aplicar promociones', description: 'Calcula y aplica promociones a items del carrito' })
  @ApiBody({ 
    schema: { 
      type: 'object',
      required: ['cartItems', 'totalAmount'],
      properties: {
        couponCode: { type: 'string', example: 'DESCUENTO50' },
        cartItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              cartItemId: { type: 'string' },
              productName: { type: 'string' },
              category: { type: 'string' },
              quantity: { type: 'number' },
              price: { type: 'number' },
              size: { type: 'string' }
            }
          }
        },
        totalAmount: { type: 'number', example: 2000 }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Descuentos aplicados exitosamente' })
  @Post('apply')
  async applyPromotions(@Request() req, @Body() applyPromotionDto: ApplyPromotionDto) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException({
        message: 'Usuario no autenticado',
        statusCode: 401
      });
    }

    if (!applyPromotionDto.cartItems || applyPromotionDto.cartItems.length === 0) {
      throw new BadRequestException({
        message: 'El carrito no puede estar vacío',
        statusCode: 400
      });
    }

    try {
      return await this.simplePromotionsService.applyPromotions(req.user.userId, applyPromotionDto);
    } catch (error) {
      throw new BadRequestException({
        message: 'Error al aplicar promociones',
        error: error.message,
        statusCode: 400
      });
    }
  }

  @ApiOperation({ summary: 'Obtener cupones del usuario', description: 'Lista cupones disponibles para el usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de cupones del usuario' })
  @Get('my-coupons')
  async getUserCoupons(@Request() req) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException({
        message: 'Usuario no autenticado',
        statusCode: 401
      });
    }

    try {
      return await this.simplePromotionsService.getUserCoupons(req.user.userId);
    } catch (error) {
      throw new BadRequestException({
        message: 'Error al obtener cupones del usuario',
        error: error.message,
        statusCode: 400
      });
    }
  }

  // ===== ENDPOINTS ADMINISTRATIVOS =====

  @ApiOperation({ summary: 'Crear promoción (Admin)', description: 'Crea una nueva promoción' })
  @ApiBody({ type: CreateSimplePromotionDto })
  @ApiResponse({ status: 201, description: 'Promoción creada exitosamente' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post('admin/create')
  async createPromotion(@Request() req, @Body() createPromotionDto: CreateSimplePromotionDto) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException({
        message: 'Usuario no autenticado',
        statusCode: 401
      });
    }

    // Validaciones específicas según el tipo
    const validationError = this.validatePromotionType(createPromotionDto);
    if (validationError) {
      throw new BadRequestException({
        message: validationError,
        statusCode: 400
      });
    }

    try {
      return await this.simplePromotionsService.createPromotion(createPromotionDto, req.user.userId);
    } catch (error) {
      throw new BadRequestException({
        message: 'Error al crear promoción',
        error: error.message,
        statusCode: 400
      });
    }
  }

  @ApiOperation({ summary: 'Listar promociones (Admin)', description: 'Lista todas las promociones con filtros' })
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

  @ApiOperation({ summary: 'Obtener promoción por ID (Admin)', description: 'Obtiene una promoción específica' })
  @ApiResponse({ status: 200, description: 'Promoción encontrada' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get('admin/:promotionId')
  async getPromotionById(@Param('promotionId') promotionId: string) {
    if (!promotionId || promotionId.trim().length === 0) {
      throw new BadRequestException({
        message: 'ID de promoción requerido',
        statusCode: 400
      });
    }

    try {
      const promotion = await this.simplePromotionsService.getPromotionById(promotionId);
      if (!promotion) {
        throw new NotFoundException({
          message: `Promoción con ID ${promotionId} no encontrada`,
          statusCode: 404
        });
      }
      return promotion;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException({
        message: `Error al obtener promoción ${promotionId}`,
        error: error.message,
        statusCode: 400
      });
    }
  }

  @ApiOperation({ summary: 'Actualizar promoción (Admin)', description: 'Actualiza una promoción existente' })
  @ApiResponse({ status: 200, description: 'Promoción actualizada exitosamente' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Put('admin/:promotionId')
  async updatePromotion(
    @Request() req,
    @Param('promotionId') promotionId: string,
    @Body() updateData: Partial<CreateSimplePromotionDto>
  ) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException({
        message: 'Usuario no autenticado',
        statusCode: 401
      });
    }

    if (!promotionId || promotionId.trim().length === 0) {
      throw new BadRequestException({
        message: 'ID de promoción requerido',
        statusCode: 400
      });
    }

    try {
      return await this.simplePromotionsService.updatePromotion(promotionId, updateData, req.user.userId);
    } catch (error) {
      throw new BadRequestException({
        message: `Error al actualizar promoción ${promotionId}`,
        error: error.message,
        statusCode: 400
      });
    }
  }

  @ApiOperation({ summary: 'Eliminar promoción (Admin)', description: 'Elimina una promoción' })
  @ApiResponse({ status: 204, description: 'Promoción eliminada exitosamente' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Delete('admin/:promotionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePromotion(@Param('promotionId') promotionId: string) {
    if (!promotionId || promotionId.trim().length === 0) {
      throw new BadRequestException({
        message: 'ID de promoción requerido',
        statusCode: 400
      });
    }

    try {
      await this.simplePromotionsService.deletePromotion(promotionId);
    } catch (error) {
      throw new BadRequestException({
        message: `Error al eliminar promoción ${promotionId}`,
        error: error.message,
        statusCode: 400
      });
    }
  }

  @ApiOperation({ summary: 'Cambiar estado de promoción (Admin)', description: 'Activa o desactiva una promoción' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      required: ['status'],
      properties: { 
        status: { type: 'string', enum: ['active', 'inactive'], example: 'active' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Estado de promoción actualizado' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Put('admin/:promotionId/status')
  async togglePromotionStatus(
    @Param('promotionId') promotionId: string,
    @Body() body: { status: 'active' | 'inactive' }
  ) {
    if (!promotionId || promotionId.trim().length === 0) {
      throw new BadRequestException({
        message: 'ID de promoción requerido',
        statusCode: 400
      });
    }

    if (!body.status || !['active', 'inactive'].includes(body.status)) {
      throw new BadRequestException({
        message: 'Estado inválido. Opciones válidas: active, inactive',
        statusCode: 400
      });
    }

    try {
      return await this.simplePromotionsService.togglePromotionStatus(promotionId, body.status);
    } catch (error) {
      throw new BadRequestException({
        message: `Error al cambiar estado de promoción ${promotionId}`,
        error: error.message,
        statusCode: 400
      });
    }
  }

  // ===== GESTIÓN DE CUPONES =====

  @ApiOperation({ summary: 'Crear cupón (Admin)', description: 'Crea un cupón para una promoción' })
  @ApiBody({ type: CreateSimpleCouponDto })
  @ApiResponse({ status: 201, description: 'Cupón creado exitosamente' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post('admin/coupons/create')
  async createCoupon(@Request() req, @Body() createCouponDto: CreateSimpleCouponDto) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException({
        message: 'Usuario no autenticado',
        statusCode: 401
      });
    }

    try {
      return await this.simplePromotionsService.createCoupon(createCouponDto, req.user.userId);
    } catch (error) {
      throw new BadRequestException({
        message: 'Error al crear cupón',
        error: error.message,
        statusCode: 400
      });
    }
  }

  @ApiOperation({ summary: 'Listar cupones (Admin)', description: 'Lista todos los cupones' })
  @ApiResponse({ status: 200, description: 'Lista de cupones' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get('admin/coupons')
  async getCoupons(@Query() query: any) {
    try {
      return await this.simplePromotionsService.getCoupons(query);
    } catch (error) {
      throw new BadRequestException({
        message: 'Error al obtener cupones',
        error: error.message,
        statusCode: 400
      });
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  private validatePromotionType(dto: CreateSimplePromotionDto): string | null {
    switch (dto.type) {
      case SimplePromotionType.PERCENTAGE:
        if (!dto.discountPercentage) {
          return 'El porcentaje de descuento es requerido para promociones de tipo percentage';
        }
        if (dto.discountPercentage <= 0 || dto.discountPercentage > 100) {
          return 'El porcentaje de descuento debe estar entre 1 y 100';
        }
        break;

      case SimplePromotionType.FIXED_AMOUNT:
        if (!dto.discountAmount) {
          return 'El monto de descuento es requerido para promociones de tipo fixed_amount';
        }
        if (dto.discountAmount <= 0) {
          return 'El monto de descuento debe ser mayor a 0';
        }
        break;

      case SimplePromotionType.BUY_X_GET_Y:
        if (!dto.buyQuantity || !dto.getQuantity) {
          return 'Las cantidades de compra y regalo son requeridas para promociones buy_x_get_y';
        }
        if (dto.buyQuantity <= 0 || dto.getQuantity <= 0) {
          return 'Las cantidades de compra y regalo deben ser mayores a 0';
        }
        break;

      case SimplePromotionType.FREE_SHIPPING:
        // No requiere campos adicionales
        break;
    }

    // Validar target
    if (dto.target === 'specific_products' && (!dto.specificProducts || dto.specificProducts.length === 0)) {
      return 'Debe especificar al menos un producto para promociones de productos específicos';
    }

    if (dto.target === 'category' && (!dto.category || dto.category.trim().length === 0)) {
      return 'Debe especificar una categoría para promociones de categoría';
    }

    return null;
  }
}

