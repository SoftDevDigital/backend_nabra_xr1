import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Promotion, PromotionStatus, PromotionType } from './schemas/promotion.schema';
import { Coupon, CouponStatus, CouponType } from './schemas/coupon.schema';
import { CreatePromotionDto } from './dtos/create-promotion.dto';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { UpdatePromotionDto } from './dtos/update-promotion.dto';
import { DiscountCalculatorService } from './discount-calculator.service';

export interface PromotionStats {
  totalPromotions: number;
  activePromotions: number;
  totalDiscountGiven: number;
  totalUses: number;
  topPromotions: Array<{
    promotion: Promotion;
    usageCount: number;
    discountGiven: number;
    conversionRate: number;
  }>;
  promotionsByType: Array<{
    type: PromotionType;
    count: number;
    totalDiscount: number;
  }>;
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    @InjectModel(Promotion.name) private promotionModel: Model<Promotion>,
    @InjectModel(Coupon.name) private couponModel: Model<Coupon>,
    private discountCalculatorService: DiscountCalculatorService,
  ) {}

  // ===== GESTIÓN DE PROMOCIONES =====

  async createPromotion(createPromotionDto: CreatePromotionDto, adminId: string): Promise<Promotion> {
    try {
      this.logger.log(`Creating promotion: ${createPromotionDto.name}`);

      // Validar fechas
      const startDate = new Date(createPromotionDto.startDate);
      const endDate = new Date(createPromotionDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date');
      }

      if (endDate <= new Date()) {
        throw new BadRequestException('End date must be in the future');
      }

      // Validar reglas según el tipo de promoción
      this.validatePromotionRules(createPromotionDto.type, createPromotionDto.rules);

      const promotion = new this.promotionModel({
        ...createPromotionDto,
        startDate,
        endDate,
        createdBy: adminId,
        status: PromotionStatus.DRAFT, // Siempre empieza como draft
      });

      await promotion.save();
      this.logger.log(`Promotion created: ${promotion._id}`);

      return promotion;

    } catch (error) {
      this.logger.error('Error creating promotion:', error);
      throw error;
    }
  }

  async updatePromotion(
    promotionId: string,
    updatePromotionDto: UpdatePromotionDto,
    adminId: string,
  ): Promise<Promotion> {
    try {
      const promotion = await this.promotionModel.findById(promotionId);
      
      if (!promotion) {
        throw new NotFoundException('Promotion not found');
      }

      // No permitir editar promociones que ya terminaron
      if (promotion.status === PromotionStatus.EXPIRED) {
        throw new BadRequestException('Cannot edit expired promotions');
      }

      // Validar nuevas fechas si se proporcionan
      if (updatePromotionDto.startDate || updatePromotionDto.endDate) {
        const startDate = updatePromotionDto.startDate 
          ? new Date(updatePromotionDto.startDate) 
          : promotion.startDate;
        const endDate = updatePromotionDto.endDate 
          ? new Date(updatePromotionDto.endDate) 
          : promotion.endDate;

        if (startDate >= endDate) {
          throw new BadRequestException('Start date must be before end date');
        }
      }

      // Validar reglas si se actualizan
      if (updatePromotionDto.rules) {
        const type = updatePromotionDto.type || promotion.type;
        this.validatePromotionRules(type, updatePromotionDto.rules);
      }

      Object.assign(promotion, updatePromotionDto);
      promotion.lastModifiedBy = adminId as any;

      await promotion.save();
      this.logger.log(`Promotion updated: ${promotionId}`);

      return promotion;

    } catch (error) {
      this.logger.error('Error updating promotion:', error);
      throw error;
    }
  }

  async deletePromotion(promotionId: string): Promise<void> {
    try {
      const promotion = await this.promotionModel.findById(promotionId);
      
      if (!promotion) {
        throw new NotFoundException('Promotion not found');
      }

      // Solo permitir eliminar promociones que no han sido usadas
      if (promotion.totalUses > 0) {
        throw new BadRequestException('Cannot delete promotion that has been used');
      }

      // Eliminar cupones asociados
      await this.couponModel.deleteMany({ promotionId });

      await this.promotionModel.findByIdAndDelete(promotionId);
      this.logger.log(`Promotion deleted: ${promotionId}`);

    } catch (error) {
      this.logger.error('Error deleting promotion:', error);
      throw error;
    }
  }

  async togglePromotionStatus(promotionId: string, status: PromotionStatus): Promise<Promotion> {
    try {
      const promotion = await this.promotionModel.findById(promotionId);
      
      if (!promotion) {
        throw new NotFoundException('Promotion not found');
      }

      // Validar transiciones de estado
      if (!this.isValidStatusTransition(promotion.status, status)) {
        throw new BadRequestException(`Invalid status transition: ${promotion.status} -> ${status}`);
      }

      promotion.status = status;
      await promotion.save();

      this.logger.log(`Promotion status changed: ${promotionId} -> ${status}`);
      return promotion;

    } catch (error) {
      this.logger.error('Error changing promotion status:', error);
      throw error;
    }
  }

  // ===== GESTIÓN DE CUPONES =====

  async createCoupon(createCouponDto: CreateCouponDto, adminId: string): Promise<Coupon> {
    try {
      this.logger.log(`Creating coupon: ${createCouponDto.code}`);

      // Verificar que el código no existe
      const existingCoupon = await this.couponModel.findOne({ 
        code: createCouponDto.code.toUpperCase() 
      });

      if (existingCoupon) {
        throw new ConflictException('Coupon code already exists');
      }

      // Verificar que la promoción existe
      const promotion = await this.promotionModel.findById(createCouponDto.promotionId);
      if (!promotion) {
        throw new NotFoundException('Promotion not found');
      }

      const coupon = new this.couponModel({
        ...createCouponDto,
        code: createCouponDto.code.toUpperCase(),
        validFrom: new Date(createCouponDto.validFrom),
        validUntil: new Date(createCouponDto.validUntil),
        createdBy: adminId,
      });

      await coupon.save();
      this.logger.log(`Coupon created: ${coupon.code}`);

      return coupon;

    } catch (error) {
      this.logger.error('Error creating coupon:', error);
      throw error;
    }
  }

  async generateBulkCoupons(
    promotionId: string,
    quantity: number,
    prefix: string = 'PROMO',
    adminId: string,
  ): Promise<Coupon[]> {
    try {
      if (quantity > 1000) {
        throw new BadRequestException('Cannot generate more than 1000 coupons at once');
      }

      const promotion = await this.promotionModel.findById(promotionId);
      if (!promotion) {
        throw new NotFoundException('Promotion not found');
      }

      const coupons: Coupon[] = [];
      const existingCodes = new Set();

      // Obtener códigos existentes
      const existing = await this.couponModel.find({}, 'code').exec();
      existing.forEach(c => existingCodes.add(c.code));

      for (let i = 0; i < quantity; i++) {
        let code: string;
        let attempts = 0;

        // Generar código único
        do {
          code = this.generateCouponCode(prefix);
          attempts++;
        } while (existingCodes.has(code) && attempts < 10);

        if (attempts >= 10) {
          throw new BadRequestException('Unable to generate unique coupon codes');
        }

        existingCodes.add(code);

        const coupon = new this.couponModel({
          code,
          name: `${promotion.name} - ${code}`,
          description: promotion.description,
          type: CouponType.SINGLE_USE,
          promotionId,
          validFrom: promotion.startDate,
          validUntil: promotion.endDate,
          maxUses: 1,
          createdBy: adminId,
        });

        coupons.push(coupon);
      }

      await this.couponModel.insertMany(coupons);
      this.logger.log(`Generated ${quantity} coupons for promotion ${promotionId}`);

      return coupons;

    } catch (error) {
      this.logger.error('Error generating bulk coupons:', error);
      throw error;
    }
  }

  // ===== CONSULTAS =====

  async getPromotions(filters: any = {}): Promise<Promotion[]> {
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    return this.promotionModel
      .find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(filters.limit || 50)
      .skip(filters.offset || 0)
      .exec();
  }

  async getPromotionById(promotionId: string): Promise<Promotion> {
    const promotion = await this.promotionModel.findById(promotionId);
    
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    return promotion;
  }

  async getCoupons(filters: any = {}): Promise<Coupon[]> {
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.promotionId) query.promotionId = filters.promotionId;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    return this.couponModel
      .find(query)
      .populate('promotionId', 'name type')
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50)
      .skip(filters.offset || 0)
      .exec();
  }

  // ===== ESTADÍSTICAS =====

  async getPromotionStats(): Promise<PromotionStats> {
    try {
      const [
        totalPromotions,
        activePromotions,
        statsAgg,
        promotionsByType,
      ] = await Promise.all([
        this.promotionModel.countDocuments({}),
        this.promotionModel.countDocuments({ status: PromotionStatus.ACTIVE, isActive: true }),
        this.getUsageStats(),
        this.getPromotionsByType(),
      ]);

      const topPromotions = await this.getTopPromotions();

      return {
        totalPromotions,
        activePromotions,
        totalDiscountGiven: statsAgg.totalDiscountGiven || 0,
        totalUses: statsAgg.totalUses || 0,
        topPromotions,
        promotionsByType,
      };

    } catch (error) {
      this.logger.error('Error getting promotion stats:', error);
      throw error;
    }
  }

  // ===== CRON JOBS =====

  @Cron(CronExpression.EVERY_HOUR)
  async updatePromotionStatuses(): Promise<void> {
    try {
      this.logger.log('Updating promotion statuses');

      const now = new Date();

      // Activar promociones que deben empezar
      await this.promotionModel.updateMany(
        {
          status: PromotionStatus.DRAFT,
          startDate: { $lte: now },
          endDate: { $gte: now },
          isActive: true,
        },
        { status: PromotionStatus.ACTIVE }
      );

      // Expirar promociones que terminaron
      await this.promotionModel.updateMany(
        {
          status: { $in: [PromotionStatus.ACTIVE, PromotionStatus.PAUSED] },
          endDate: { $lt: now },
        },
        { status: PromotionStatus.EXPIRED }
      );

      // Expirar cupones
      await this.couponModel.updateMany(
        {
          status: CouponStatus.ACTIVE,
          validUntil: { $lt: now },
        },
        { status: CouponStatus.EXPIRED }
      );

      this.logger.log('Promotion statuses updated');

    } catch (error) {
      this.logger.error('Error updating promotion statuses:', error);
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  private validatePromotionRules(type: PromotionType, rules: any): void {
    switch (type) {
      case PromotionType.PERCENTAGE:
        if (!rules.discountPercentage || rules.discountPercentage <= 0 || rules.discountPercentage > 100) {
          throw new BadRequestException('Discount percentage must be between 1 and 100');
        }
        break;

      case PromotionType.FIXED_AMOUNT:
        if (!rules.discountAmount || rules.discountAmount <= 0) {
          throw new BadRequestException('Discount amount must be greater than 0');
        }
        break;

      case PromotionType.BUY_X_GET_Y:
        if (!rules.buyQuantity || !rules.getQuantity || rules.buyQuantity <= 0 || rules.getQuantity <= 0) {
          throw new BadRequestException('Buy and get quantities must be greater than 0');
        }
        break;

      case PromotionType.QUANTITY_DISCOUNT:
        if (!rules.quantityTiers || rules.quantityTiers.length === 0) {
          throw new BadRequestException('Quantity tiers are required for quantity discount');
        }
        break;

      case PromotionType.CATEGORY_DISCOUNT:
        if (!rules.discountPercentage || rules.discountPercentage <= 0) {
          throw new BadRequestException('Discount percentage is required for category discount');
        }
        break;
    }
  }

  private isValidStatusTransition(currentStatus: PromotionStatus, newStatus: PromotionStatus): boolean {
    const validTransitions: Record<PromotionStatus, PromotionStatus[]> = {
      [PromotionStatus.DRAFT]: [PromotionStatus.ACTIVE, PromotionStatus.CANCELLED],
      [PromotionStatus.ACTIVE]: [PromotionStatus.PAUSED, PromotionStatus.CANCELLED, PromotionStatus.EXPIRED],
      [PromotionStatus.PAUSED]: [PromotionStatus.ACTIVE, PromotionStatus.CANCELLED],
      [PromotionStatus.EXPIRED]: [], // No se puede cambiar desde expirado
      [PromotionStatus.CANCELLED]: [], // No se puede cambiar desde cancelado
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private generateCouponCode(prefix: string): string {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const numberPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${randomPart}${numberPart}`;
  }

  private async getUsageStats(): Promise<any> {
    const result = await this.promotionModel.aggregate([
      {
        $group: {
          _id: null,
          totalDiscountGiven: { $sum: '$totalDiscountGiven' },
          totalUses: { $sum: '$totalUses' },
        },
      },
    ]);

    return result[0] || { totalDiscountGiven: 0, totalUses: 0 };
  }

  private async getPromotionsByType(): Promise<any[]> {
    return this.promotionModel.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalDiscount: { $sum: '$totalDiscountGiven' },
        },
      },
      {
        $project: {
          type: '$_id',
          count: 1,
          totalDiscount: { $round: ['$totalDiscount', 2] },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  private async getTopPromotions(): Promise<any[]> {
    return this.promotionModel.aggregate([
      { $match: { totalUses: { $gt: 0 } } },
      {
        $addFields: {
          conversionRate: {
            $multiply: [
              { $divide: ['$conversionCount', { $add: ['$viewCount', 1] }] },
              100,
            ],
          },
        },
      },
      {
        $project: {
          promotion: '$$ROOT',
          usageCount: '$totalUses',
          discountGiven: { $round: ['$totalDiscountGiven', 2] },
          conversionRate: { $round: ['$conversionRate', 2] },
        },
      },
      { $sort: { usageCount: -1 } },
      { $limit: 10 },
    ]);
  }

  // ===== APLICACIÓN DE DESCUENTOS =====

  async applyDiscounts(userId: string, applyDiscountDto: any): Promise<any> {
    return this.discountCalculatorService.calculateDiscounts(userId, applyDiscountDto);
  }

  async validateCoupon(couponCode: string, userId?: string): Promise<any> {
    return this.discountCalculatorService.validateCoupon(couponCode, userId);
  }

  async getActivePromotions(userId?: string): Promise<Promotion[]> {
    return this.discountCalculatorService.getActivePromotions(userId);
  }

  async getPublicCoupons(): Promise<Coupon[]> {
    return this.discountCalculatorService.getPublicCoupons();
  }

  // ===== REGISTRO DE USO =====

  async recordPromotionUsage(
    promotionId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
    couponCode?: string,
  ): Promise<void> {
    try {
      const promotion = await this.promotionModel.findById(promotionId);
      if (!promotion) return;

      // Agregar al historial de uso
      promotion.usageHistory.push({
        userId: userId as any,
        usedAt: new Date(),
        orderId,
        discountAmount,
        couponCode,
      });

      // Actualizar contadores
      promotion.totalUses += 1;
      promotion.totalDiscountGiven += discountAmount;
      promotion.conversionCount += 1;

      await promotion.save();

      // Si se usó un cupón, actualizar también el cupón
      if (couponCode) {
        await this.recordCouponUsage(couponCode, userId, orderId, discountAmount);
      }

      this.logger.log(`Promotion usage recorded: ${promotionId}`);

    } catch (error) {
      this.logger.error('Error recording promotion usage:', error);
    }
  }

  private async recordCouponUsage(
    couponCode: string,
    userId: string,
    orderId: string,
    discountAmount: number,
  ): Promise<void> {
    try {
      const coupon = await this.couponModel.findOne({ code: couponCode.toUpperCase() });
      if (!coupon) return;

      // Agregar al historial
      coupon.usageHistory.push({
        userId: userId as any,
        usedAt: new Date(),
        orderId,
        discountAmount,
        orderTotal: 0, // TODO: Pasar el total de la orden
      });

      // Actualizar contadores
      coupon.totalUses += 1;
      coupon.totalDiscountGiven += discountAmount;
      coupon.successCount += 1;
      coupon.lastUsedAt = new Date();
      coupon.lastUsedBy = userId as any;

      // Marcar como usado si es single use
      if (coupon.type === CouponType.SINGLE_USE) {
        coupon.status = CouponStatus.USED;
      }

      await coupon.save();

    } catch (error) {
      this.logger.error('Error recording coupon usage:', error);
    }
  }

  // ===== BÚSQUEDAS Y FILTROS =====

  async searchPromotions(searchTerm: string): Promise<Promotion[]> {
    return this.promotionModel.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ],
    }).limit(20).exec();
  }

  async getPromotionsByCategory(category: string): Promise<Promotion[]> {
    return this.promotionModel.find({
      status: PromotionStatus.ACTIVE,
      isActive: true,
      'conditions.categories': category,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).sort({ priority: -1 }).exec();
  }

  async getPromotionsByProduct(productId: string): Promise<Promotion[]> {
    return this.promotionModel.find({
      status: PromotionStatus.ACTIVE,
      isActive: true,
      'conditions.specificProducts': productId,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).sort({ priority: -1 }).exec();
  }
}
