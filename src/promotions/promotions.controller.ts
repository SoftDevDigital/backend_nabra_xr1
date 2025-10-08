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
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { DiscountCalculatorService } from './discount-calculator.service';
import { CreatePromotionDto } from './dtos/create-promotion.dto';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { UpdatePromotionDto } from './dtos/update-promotion.dto';
import { ApplyDiscountDto } from './dtos/apply-discount.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PromotionStatus } from './schemas/promotion.schema';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(
    private promotionsService: PromotionsService,
    private discountCalculatorService: DiscountCalculatorService,
  ) {}

  // ===== ENDPOINTS PÚBLICOS =====

  @ApiOperation({ summary: 'Promos activas', description: 'Lista de promociones actualmente activas.' })
  @Public()
  @Get('active')
  async getActivePromotions() {
    return this.promotionsService.getActivePromotions();
  }

  @ApiOperation({ summary: 'Cupones públicos', description: 'Lista de cupones visibles públicamente.' })
  @Public()
  @Get('coupons/public')
  async getPublicCoupons() {
    return this.promotionsService.getPublicCoupons();
  }

  @ApiOperation({ summary: 'Promos por categoría', description: 'Promociones aplicables a una categoría.' })
  @ApiParam({ name: 'category', description: 'Slug o nombre de categoría' })
  @Public()
  @Get('category/:category')
  async getPromotionsByCategory(@Param('category') category: string) {
    return this.promotionsService.getPromotionsByCategory(category);
  }

  @ApiOperation({ summary: 'Promos por producto', description: 'Promociones aplicables a un producto.' })
  @ApiParam({ name: 'productId', description: 'ID del producto' })
  @Public()
  @Get('product/:productId')
  async getPromotionsByProduct(@Param('productId') productId: string) {
    return this.promotionsService.getPromotionsByProduct(productId);
  }

  @ApiOperation({ summary: 'Validar cupón', description: 'Valida un cupón antes de aplicarlo.' })
  @ApiBody({ schema: { type: 'object', properties: { couponCode: { type: 'string', example: 'BIENVENIDA10' }, userId: { type: 'string', example: '64f...' } }, required: ['couponCode'] } })
  @Public()
  @Post('validate-coupon')
  async validateCoupon(@Body() body: { couponCode: string; userId?: string }) {
    return this.discountCalculatorService.validateCoupon(body.couponCode, body.userId);
  }

  // ===== ENDPOINTS DE USUARIO =====

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Aplicar descuentos', description: 'Calcula y aplica descuentos sobre items y total del carrito.' })
  @Post('apply-discounts')
  async applyDiscounts(@Request() req, @Body() applyDiscountDto: ApplyDiscountDto) {
    return this.discountCalculatorService.calculateDiscounts(req.user.userId, applyDiscountDto);
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Mis cupones', description: 'Lista de cupones disponibles para el usuario autenticado.' })
  @Get('my-coupons')
  async getUserCoupons(@Request() req) {
    const coupons = await this.promotionsService.getCoupons({
      specificUserId: req.user.userId,
      status: 'active',
    });

    return coupons;
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Aplicar cupón directo', description: 'Aplica un cupón sobre el carrito del usuario.' })
  @ApiBody({ schema: { type: 'object', required: ['couponCode','cartItems','totalAmount'], example: { couponCode: 'BIENVENIDA10', cartItems: [{ productId: '64f...', cartItemId: '650...', productName: 'Remera', category: 'indumentaria', quantity: 1, price: 3999.99 }], totalAmount: 3999.99 } } })
  @Post('apply-coupon')
  async applyCoupon(
    @Request() req,
    @Body() body: { couponCode: string; cartItems: any[]; totalAmount: number },
  ) {
    const applyDiscountDto: ApplyDiscountDto = {
      couponCode: body.couponCode,
      cartItems: body.cartItems,
      totalAmount: body.totalAmount,
    };

    return this.discountCalculatorService.calculateDiscounts(req.user.userId, applyDiscountDto);
  }

  // ===== ENDPOINTS ADMINISTRATIVOS =====

  @Roles('admin')
  @ApiOperation({ summary: 'Listar promociones (admin)', description: 'Listado filtrado y paginado de promociones.' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @Get('admin/all')
  async getAllPromotions(@Query() query: any) {
    return this.promotionsService.getPromotions({
      status: query.status,
      type: query.type,
      isActive: query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Estadísticas (admin)', description: 'KPIs y métricas de promociones.' })
  @Get('admin/stats')
  async getPromotionStats() {
    return this.promotionsService.getPromotionStats();
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Crear promoción', description: 'Crea una promoción nueva.' })
  @Post('admin/create')
  async createPromotion(@Request() req, @Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.createPromotion(createPromotionDto, req.user.userId);
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar promoción', description: 'Actualiza campos de una promoción existente.' })
  @ApiParam({ name: 'promotionId', description: 'ID de la promoción' })
  @Put('admin/:promotionId')
  async updatePromotion(
    @Request() req,
    @Param('promotionId') promotionId: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    return this.promotionsService.updatePromotion(promotionId, updatePromotionDto, req.user.userId);
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar promoción', description: 'Elimina una promoción por ID.' })
  @ApiParam({ name: 'promotionId', description: 'ID de la promoción' })
  @Delete('admin/:promotionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePromotion(@Param('promotionId') promotionId: string) {
    await this.promotionsService.deletePromotion(promotionId);
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Cambiar estado', description: 'Cambia el estado de una promoción.' })
  @ApiParam({ name: 'promotionId', description: 'ID de la promoción' })
  @Put('admin/:promotionId/status')
  async changePromotionStatus(
    @Param('promotionId') promotionId: string,
    @Body() body: { status: PromotionStatus },
  ) {
    return this.promotionsService.togglePromotionStatus(promotionId, body.status);
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Obtener promoción', description: 'Obtiene una promoción por ID.' })
  @ApiParam({ name: 'promotionId', description: 'ID de la promoción' })
  @Get('admin/:promotionId')
  async getPromotionById(@Param('promotionId') promotionId: string) {
    return this.promotionsService.getPromotionById(promotionId);
  }

  // ===== GESTIÓN DE CUPONES =====

  @Roles('admin')
  @ApiOperation({ summary: 'Listar cupones', description: 'Listado de cupones con filtros.' })
  @Get('admin/coupons')
  async getCoupons(@Query() query: any) {
    return this.promotionsService.getCoupons({
      status: query.status,
      type: query.type,
      promotionId: query.promotionId,
      isActive: query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Crear cupón', description: 'Crea un cupón asociado a una promoción.' })
  @Post('admin/coupons/create')
  async createCoupon(@Request() req, @Body() createCouponDto: CreateCouponDto) {
    return this.promotionsService.createCoupon(createCouponDto, req.user.userId);
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Generar cupones masivos', description: 'Genera N cupones para una promoción con prefijo opcional.' })
  @Post('admin/coupons/generate-bulk')
  async generateBulkCoupons(
    @Request() req,
    @Body() body: { promotionId: string; quantity: number; prefix?: string },
  ) {
    if (!body.promotionId || !body.quantity) {
      throw new BadRequestException('Promotion ID and quantity are required');
    }

    if (body.quantity < 1 || body.quantity > 1000) {
      throw new BadRequestException('Quantity must be between 1 and 1000');
    }

    return this.promotionsService.generateBulkCoupons(
      body.promotionId,
      body.quantity,
      body.prefix || 'BULK',
      req.user.userId,
    );
  }

  // ===== BÚSQUEDAS Y FILTROS =====

  @Roles('admin')
  @ApiOperation({ summary: 'Buscar promociones', description: 'Búsqueda de promociones por término.' })
  @ApiQuery({ name: 'q', required: true })
  @Get('admin/search')
  async searchPromotions(@Query('q') searchTerm: string) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new BadRequestException('Search term must be at least 2 characters');
    }

    return this.promotionsService.searchPromotions(searchTerm);
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Próximas a vencer', description: 'Promociones que vencen dentro de N días (default 7).' })
  @ApiQuery({ name: 'days', required: false })
  @Get('admin/expiring-soon')
  async getExpiringSoonPromotions(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 7;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysNum);

    return this.promotionsService.getPromotions({
      status: PromotionStatus.ACTIVE,
      endDate: { $lte: futureDate },
    });
  }

  @Roles('admin')
  @ApiOperation({ summary: 'No usadas', description: 'Promociones sin uso y no expiradas.' })
  @Get('admin/unused')
  async getUnusedPromotions() {
    return this.promotionsService.getPromotions({
      totalUses: 0,
      status: { $ne: PromotionStatus.EXPIRED },
    });
  }

  // ===== ENDPOINTS DE TESTING ===== (eliminados)

  // ===== REPORTES =====

  @Roles('admin')
  @Get('admin/reports/usage')
  async getUsageReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('promotionId') promotionId?: string,
  ) {
    const query: any = {};

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (promotionId) query._id = promotionId;

    const promotions = await this.promotionsService.getPromotions(query);

    return {
      period: { from: dateFrom, to: dateTo },
      promotions: promotions.map(p => ({
        id: p._id,
        name: p.name,
        type: p.type,
        totalUses: p.totalUses,
        totalDiscountGiven: Math.round(p.totalDiscountGiven * 100) / 100,
        conversionRate: p.viewCount > 0 ? ((p.conversionCount / p.viewCount) * 100) : 0,
        status: p.status,
      })),
      summary: {
        totalPromotions: promotions.length,
        totalUses: promotions.reduce((sum, p) => sum + p.totalUses, 0),
        totalDiscountGiven: promotions.reduce((sum, p) => sum + p.totalDiscountGiven, 0),
      },
    };
  }
}
