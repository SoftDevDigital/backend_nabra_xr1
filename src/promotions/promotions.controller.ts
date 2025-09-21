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

@Controller('promotions')
export class PromotionsController {
  constructor(
    private promotionsService: PromotionsService,
    private discountCalculatorService: DiscountCalculatorService,
  ) {}

  // ===== ENDPOINTS PÚBLICOS =====

  @Public()
  @Get('active')
  async getActivePromotions() {
    return this.promotionsService.getActivePromotions();
  }

  @Public()
  @Get('coupons/public')
  async getPublicCoupons() {
    return this.promotionsService.getPublicCoupons();
  }

  @Public()
  @Get('category/:category')
  async getPromotionsByCategory(@Param('category') category: string) {
    return this.promotionsService.getPromotionsByCategory(category);
  }

  @Public()
  @Get('product/:productId')
  async getPromotionsByProduct(@Param('productId') productId: string) {
    return this.promotionsService.getPromotionsByProduct(productId);
  }

  @Public()
  @Post('validate-coupon')
  async validateCoupon(@Body() body: { couponCode: string; userId?: string }) {
    return this.discountCalculatorService.validateCoupon(body.couponCode, body.userId);
  }

  // ===== ENDPOINTS DE USUARIO =====

  @Post('apply-discounts')
  async applyDiscounts(@Request() req, @Body() applyDiscountDto: ApplyDiscountDto) {
    return this.discountCalculatorService.calculateDiscounts(req.user.userId, applyDiscountDto);
  }

  @Get('my-coupons')
  async getUserCoupons(@Request() req) {
    const coupons = await this.promotionsService.getCoupons({
      specificUserId: req.user.userId,
      status: 'active',
    });

    return coupons;
  }

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
  @Get('admin/stats')
  async getPromotionStats() {
    return this.promotionsService.getPromotionStats();
  }

  @Roles('admin')
  @Post('admin/create')
  async createPromotion(@Request() req, @Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.createPromotion(createPromotionDto, req.user.userId);
  }

  @Roles('admin')
  @Put('admin/:promotionId')
  async updatePromotion(
    @Request() req,
    @Param('promotionId') promotionId: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    return this.promotionsService.updatePromotion(promotionId, updatePromotionDto, req.user.userId);
  }

  @Roles('admin')
  @Delete('admin/:promotionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePromotion(@Param('promotionId') promotionId: string) {
    await this.promotionsService.deletePromotion(promotionId);
  }

  @Roles('admin')
  @Put('admin/:promotionId/status')
  async changePromotionStatus(
    @Param('promotionId') promotionId: string,
    @Body() body: { status: PromotionStatus },
  ) {
    return this.promotionsService.togglePromotionStatus(promotionId, body.status);
  }

  @Roles('admin')
  @Get('admin/:promotionId')
  async getPromotionById(@Param('promotionId') promotionId: string) {
    return this.promotionsService.getPromotionById(promotionId);
  }

  // ===== GESTIÓN DE CUPONES =====

  @Roles('admin')
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
  @Post('admin/coupons/create')
  async createCoupon(@Request() req, @Body() createCouponDto: CreateCouponDto) {
    return this.promotionsService.createCoupon(createCouponDto, req.user.userId);
  }

  @Roles('admin')
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
  @Get('admin/search')
  async searchPromotions(@Query('q') searchTerm: string) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new BadRequestException('Search term must be at least 2 characters');
    }

    return this.promotionsService.searchPromotions(searchTerm);
  }

  @Roles('admin')
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
  @Get('admin/unused')
  async getUnusedPromotions() {
    return this.promotionsService.getPromotions({
      totalUses: 0,
      status: { $ne: PromotionStatus.EXPIRED },
    });
  }

  // ===== ENDPOINTS DE TESTING =====

  @Roles('admin')
  @Post('admin/test-discount')
  async testDiscount(@Body() testData: {
    promotionId: string;
    cartItems: any[];
    totalAmount: number;
    userId?: string;
  }) {
    // Endpoint para probar promociones antes de activarlas
    const promotion = await this.promotionsService.getPromotionById(testData.promotionId);
    
    // Simular aplicación de descuento
    const applyDiscountDto: ApplyDiscountDto = {
      cartItems: testData.cartItems,
      totalAmount: testData.totalAmount,
    };

    return this.discountCalculatorService.calculateDiscounts(
      testData.userId || 'test-user',
      applyDiscountDto
    );
  }

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
