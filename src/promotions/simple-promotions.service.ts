import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SimplePromotion } from './schemas/simple-promotion.schema';
import { SimpleCoupon } from './schemas/simple-coupon.schema';
import { CreateSimplePromotionDto } from './dtos/simple-promotion.dto';
import { CreateSimpleCouponDto } from './dtos/simple-promotion.dto';
import { PromotionStatus } from './schemas/simple-promotion.schema';

@Injectable()
export class SimplePromotionsService {
  private readonly logger = new Logger(SimplePromotionsService.name);

  constructor(
    @InjectModel(SimplePromotion.name) private promotionModel: Model<SimplePromotion>,
    @InjectModel(SimpleCoupon.name) private couponModel: Model<SimpleCoupon>,
  ) {}

  // ===== GESTIÓN DE PROMOCIONES =====

  async createPromotion(createPromotionDto: CreateSimplePromotionDto, adminId: string): Promise<SimplePromotion> {
    try {
      this.logger.log(`Creando promoción: ${createPromotionDto.name}`);

      // Validar fechas
      const startDate = new Date(createPromotionDto.startDate);
      const endDate = new Date(createPromotionDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
      }

      if (endDate <= new Date()) {
        throw new BadRequestException('La fecha de fin debe ser futura');
      }

      // Crear promoción simple
      const promotion = new this.promotionModel({
        name: createPromotionDto.name,
        description: createPromotionDto.description,
        type: createPromotionDto.type,
        target: createPromotionDto.target,
        startDate,
        endDate,
        discountPercentage: createPromotionDto.discountPercentage,
        discountAmount: createPromotionDto.discountAmount,
        buyQuantity: createPromotionDto.buyQuantity,
        getQuantity: createPromotionDto.getQuantity,
        specificProducts: createPromotionDto.specificProducts,
        category: createPromotionDto.category,
        minimumPurchaseAmount: createPromotionDto.minimumPurchaseAmount,
        minimumQuantity: createPromotionDto.minimumQuantity,
        isActive: createPromotionDto.isActive ?? true,
        isAutomatic: createPromotionDto.isAutomatic ?? true,
        createdBy: adminId,
        status: PromotionStatus.ACTIVE,
      });

      await promotion.save();
      this.logger.log(`Promoción creada: ${promotion._id}`);

      return promotion;

    } catch (error) {
      this.logger.error('Error creando promoción:', error);
      throw error;
    }
  }

  async getActivePromotions(): Promise<SimplePromotion[]> {
    const now = new Date();
    return this.promotionModel.find({
      status: PromotionStatus.ACTIVE,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ createdAt: -1 }).exec();
  }

  async getPromotionsByProduct(productId: string): Promise<SimplePromotion[]> {
    const now = new Date();
    return this.promotionModel.find({
      status: PromotionStatus.ACTIVE,
      isActive: true,
      specificProducts: productId,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ createdAt: -1 }).exec();
  }

  async getAllPromotions(query: any): Promise<any> {
    const { page = 1, limit = 10, status, type, target } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (target) filter.target = target;

    const [promotions, total] = await Promise.all([
      this.promotionModel.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).exec(),
      this.promotionModel.countDocuments(filter),
    ]);

    return {
      promotions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  async deletePromotion(promotionId: string): Promise<{ message: string }> {
    const result = await this.promotionModel.findByIdAndDelete(promotionId);
    if (!result) {
      throw new NotFoundException('Promoción no encontrada');
    }
    return { message: 'Promoción eliminada exitosamente' };
  }

  // ===== GESTIÓN DE CUPONES =====

  async createCoupon(createCouponDto: CreateSimpleCouponDto, adminId: string): Promise<SimpleCoupon> {
    const coupon = new this.couponModel({
      ...createCouponDto,
      createdBy: adminId,
    });

    return coupon.save();
  }

  async getCoupons(query: any): Promise<any> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
      this.couponModel.find().skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).exec(),
      this.couponModel.countDocuments(),
    ]);

    return {
      coupons,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    };
  }
}