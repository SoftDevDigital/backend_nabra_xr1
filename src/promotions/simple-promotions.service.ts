import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SimplePromotion, PromotionStatus } from './schemas/simple-promotion.schema';
import { SimpleCoupon, CouponStatus } from './schemas/simple-coupon.schema';
import { 
  CreateSimplePromotionDto, 
  ApplyPromotionDto, 
  CreateSimpleCouponDto,
  SimplePromotionType 
} from './dtos/simple-promotion.dto';

export interface DiscountResult {
  success: boolean;
  appliedPromotions: Array<{
    promotionId: string;
    promotionName: string;
    type: string;
    discountAmount: number;
    discountPercentage?: number;
    description: string;
  }>;
  totalDiscount: number;
  originalTotal: number;
  finalTotal: number;
  savings: number;
  errors?: string[];
}

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

      // Crear promoción sin campos que causen problemas de índice
      const promotionData = {
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
      };

      const promotion = new this.promotionModel(promotionData);

      await promotion.save();
      this.logger.log(`Promoción creada: ${promotion._id}`);

      return promotion;

    } catch (error) {
      this.logger.error('Error creando promoción:', error);
      throw error;
    }
  }

  async updatePromotion(
    promotionId: string,
    updateData: Partial<CreateSimplePromotionDto>,
    adminId: string,
  ): Promise<SimplePromotion> {
    try {
      const promotion = await this.promotionModel.findById(promotionId);
      
      if (!promotion) {
        throw new NotFoundException('Promoción no encontrada');
      }

      // Validar fechas si se actualizan
      if (updateData.startDate || updateData.endDate) {
        const startDate = updateData.startDate ? new Date(updateData.startDate) : promotion.startDate;
        const endDate = updateData.endDate ? new Date(updateData.endDate) : promotion.endDate;

        if (startDate >= endDate) {
          throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
        }
      }

      Object.assign(promotion, updateData);
      // lastModifiedBy eliminado del esquema

      await promotion.save();
      this.logger.log(`Promoción actualizada: ${promotionId}`);

      return promotion;

    } catch (error) {
      this.logger.error('Error actualizando promoción:', error);
      throw error;
    }
  }

  async deletePromotion(promotionId: string): Promise<void> {
    try {
      const promotion = await this.promotionModel.findById(promotionId);
      
      if (!promotion) {
        throw new NotFoundException('Promoción no encontrada');
      }

      // Solo permitir eliminar promociones que no han sido usadas
      if (promotion.totalUses > 0) {
        throw new BadRequestException('No se puede eliminar una promoción que ha sido utilizada');
      }

      // Eliminar cupones asociados
      await this.couponModel.deleteMany({ promotionId });

      await this.promotionModel.findByIdAndDelete(promotionId);
      this.logger.log(`Promoción eliminada: ${promotionId}`);

    } catch (error) {
      this.logger.error('Error eliminando promoción:', error);
      throw error;
    }
  }

  async togglePromotionStatus(promotionId: string, status: 'active' | 'inactive'): Promise<SimplePromotion> {
    try {
      const promotion = await this.promotionModel.findById(promotionId);
      
      if (!promotion) {
        throw new NotFoundException('Promoción no encontrada');
      }

      promotion.status = status as PromotionStatus;
      promotion.isActive = status === 'active';
      await promotion.save();

      this.logger.log(`Estado de promoción cambiado: ${promotionId} -> ${status}`);
      return promotion;

    } catch (error) {
      this.logger.error('Error cambiando estado de promoción:', error);
      throw error;
    }
  }

  // ===== GESTIÓN DE CUPONES =====

  async createCoupon(createCouponDto: CreateSimpleCouponDto, adminId: string): Promise<SimpleCoupon> {
    try {
      this.logger.log(`Creando cupón: ${createCouponDto.code}`);

      // Verificar que el código no existe
      const existingCoupon = await this.couponModel.findOne({ 
        code: createCouponDto.code.toUpperCase() 
      });

      if (existingCoupon) {
        throw new ConflictException('El código de cupón ya existe');
      }

      // Verificar que la promoción existe
      const promotion = await this.promotionModel.findById(createCouponDto.promotionId);
      if (!promotion) {
        throw new NotFoundException('Promoción no encontrada');
      }

      const coupon = new this.couponModel({
        ...createCouponDto,
        code: createCouponDto.code.toUpperCase(),
        validFrom: new Date(createCouponDto.validFrom),
        validUntil: new Date(createCouponDto.validUntil),
        createdBy: adminId,
      });

      await coupon.save();
      this.logger.log(`Cupón creado: ${coupon.code}`);

      return coupon;

    } catch (error) {
      this.logger.error('Error creando cupón:', error);
      throw error;
    }
  }

  // ===== CONSULTAS =====

  async getActivePromotions(): Promise<SimplePromotion[]> {
    const now = new Date();
    
    return this.promotionModel
      .find({
        status: PromotionStatus.ACTIVE,
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPromotionsByProduct(productId: string): Promise<SimplePromotion[]> {
    const now = new Date();

    return this.promotionModel
      .find({
        status: PromotionStatus.ACTIVE,
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
        $or: [
          { target: 'all_products' },
          { target: 'specific_products', specificProducts: { $in: [productId] } },
        ]
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAllPromotions(filters: any = {}): Promise<SimplePromotion[]> {
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    return this.promotionModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50)
      .skip(filters.offset || 0)
      .exec();
  }

  async getPromotionById(promotionId: string): Promise<SimplePromotion> {
    const promotion = await this.promotionModel.findById(promotionId);
    
    if (!promotion) {
      throw new NotFoundException('Promoción no encontrada');
    }

    return promotion;
  }

  async getCoupons(filters: any = {}): Promise<SimpleCoupon[]> {
    const query: any = {};

    if (filters.status) query.status = filters.status;
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

  async getUserCoupons(userId: string): Promise<SimpleCoupon[]> {
    const now = new Date();

    return this.couponModel
      .find({
        status: CouponStatus.ACTIVE,
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
      })
      .populate('promotionId', 'name type description')
      .sort({ createdAt: -1 })
      .exec();
  }

  // ===== APLICACIÓN DE PROMOCIONES =====

  async applyPromotions(userId: string, applyPromotionDto: ApplyPromotionDto): Promise<DiscountResult> {
    try {
      this.logger.log(`Aplicando promociones para usuario: ${userId}`);

      const { cartItems, totalAmount, couponCode } = applyPromotionDto;
      const appliedPromotions: any[] = [];
      let totalDiscount = 0;
      const errors: string[] = [];

      // 1. Aplicar promociones automáticas
      const automaticPromotions = await this.getAutomaticPromotions(cartItems);
      
      for (const promotion of automaticPromotions) {
        try {
          const discount = this.calculatePromotionDiscount(promotion, cartItems, totalAmount);
          
          if (discount.discountAmount > 0) {
            appliedPromotions.push({
              promotionId: (promotion._id as any).toString(),
              promotionName: promotion.name,
              type: promotion.type,
              discountAmount: discount.discountAmount,
              discountPercentage: promotion.discountPercentage,
              description: discount.description,
            });
            totalDiscount += discount.discountAmount;
          }
        } catch (error) {
          errors.push(`Error aplicando promoción ${promotion.name}: ${error.message}`);
        }
      }

      // 2. Aplicar cupón si se proporciona
      if (couponCode) {
        try {
          const couponDiscount = await this.applyCoupon(couponCode, userId, cartItems, totalAmount);
          
          if (couponDiscount.discountAmount > 0) {
            appliedPromotions.push({
              promotionId: (couponDiscount.promotionId as any).toString(),
              promotionName: couponDiscount.promotionName,
              type: couponDiscount.type,
              discountAmount: couponDiscount.discountAmount,
              discountPercentage: couponDiscount.discountPercentage,
              description: `Cupón ${couponCode}: ${couponDiscount.description}`,
            });
            totalDiscount += couponDiscount.discountAmount;
          }
        } catch (error) {
          errors.push(`Error aplicando cupón ${couponCode}: ${error.message}`);
        }
      }

      const finalTotal = Math.max(0, totalAmount - totalDiscount);

      return {
        success: errors.length === 0,
        appliedPromotions,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        originalTotal: Math.round(totalAmount * 100) / 100,
        finalTotal: Math.round(finalTotal * 100) / 100,
        savings: Math.round(totalDiscount * 100) / 100,
        errors: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      this.logger.error('Error aplicando promociones:', error);
      throw new BadRequestException(`Error aplicando promociones: ${error.message}`);
    }
  }

  async validateCoupon(couponCode: string, userId?: string): Promise<{
    valid: boolean;
    coupon?: any;
    promotion?: any;
    message: string;
  }> {
    try {
      const coupon = await this.couponModel
        .findOne({ code: couponCode.toUpperCase() })
        .populate('promotionId')
        .exec();

      if (!coupon) {
        return {
          valid: false,
          message: 'Cupón no encontrado',
        };
      }

      // Validaciones básicas
      const now = new Date();
      
      if (coupon.status !== CouponStatus.ACTIVE || !coupon.isActive) {
        return {
          valid: false,
          coupon,
          message: 'Cupón no activo',
        };
      }

      if (now < coupon.validFrom) {
        return {
          valid: false,
          coupon,
          message: `Cupón válido desde ${coupon.validFrom.toLocaleDateString()}`,
        };
      }

      if (now > coupon.validUntil) {
        return {
          valid: false,
          coupon,
          message: 'Cupón expirado',
        };
      }

      if (coupon.maxUses && coupon.totalUses >= coupon.maxUses) {
        return {
          valid: false,
          coupon,
          message: 'Cupón agotado',
        };
      }

      return {
        valid: true,
        coupon,
        promotion: coupon.promotionId,
        message: 'Cupón válido',
      };

    } catch (error) {
      this.logger.error('Error validando cupón:', error);
      return {
        valid: false,
        message: 'Error validando cupón',
      };
    }
  }

  // ===== MÉTODOS PRIVADOS =====

  private async getAutomaticPromotions(cartItems: any[]): Promise<SimplePromotion[]> {
    const now = new Date();
    const productIds = cartItems.map(item => item.productId);
    const categories = [...new Set(cartItems.map(item => item.category))];

    return this.promotionModel.find({
      status: PromotionStatus.ACTIVE,
      isActive: true,
      isAutomatic: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { target: 'all_products' },
        { target: 'specific_products', specificProducts: { $in: productIds } },
        { target: 'category', category: { $in: categories } },
      ]
    }).sort({ createdAt: -1 }).exec();
  }

  private calculatePromotionDiscount(promotion: SimplePromotion, cartItems: any[], totalAmount: number): {
    discountAmount: number;
    description: string;
  } {
    let discountAmount = 0;
    let description = '';

    // Verificar condiciones mínimas
    if (promotion.minimumPurchaseAmount && totalAmount < promotion.minimumPurchaseAmount) {
      return { discountAmount: 0, description: `Compra mínima de $${promotion.minimumPurchaseAmount} requerida` };
    }

    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (promotion.minimumQuantity && totalQuantity < promotion.minimumQuantity) {
      return { discountAmount: 0, description: `Cantidad mínima de ${promotion.minimumQuantity} productos requerida` };
    }

    // Calcular descuento según el tipo
    switch (promotion.type) {
      case SimplePromotionType.PERCENTAGE:
        const applicableItems = this.getApplicableItems(promotion, cartItems);
        const applicableTotal = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        discountAmount = (applicableTotal * promotion.discountPercentage!) / 100;
        description = `${promotion.discountPercentage}% de descuento`;
        break;

      case SimplePromotionType.FIXED_AMOUNT:
        discountAmount = Math.min(promotion.discountAmount!, totalAmount);
        description = `$${discountAmount} de descuento`;
        break;

      case SimplePromotionType.BUY_X_GET_Y:
        const buyXGetYDiscount = this.calculateBuyXGetYDiscount(promotion, cartItems);
        discountAmount = buyXGetYDiscount.discountAmount;
        description = buyXGetYDiscount.description;
        break;

      case SimplePromotionType.FREE_SHIPPING:
        // El descuento de envío se maneja en el servicio de shipping
        discountAmount = 0;
        description = 'Envío gratis aplicado';
        break;
    }

    return {
      discountAmount: Math.round(discountAmount * 100) / 100,
      description
    };
  }

  private getApplicableItems(promotion: SimplePromotion, cartItems: any[]): any[] {
    switch (promotion.target) {
      case 'all_products':
        return cartItems;
      case 'specific_products':
        return cartItems.filter(item => 
          promotion.specificProducts?.includes(item.productId)
        );
      case 'category':
        return cartItems.filter(item => 
          item.category === promotion.category
        );
      default:
        return [];
    }
  }

  private calculateBuyXGetYDiscount(promotion: SimplePromotion, cartItems: any[]): {
    discountAmount: number;
    description: string;
  } {
    const applicableItems = this.getApplicableItems(promotion, cartItems);
    let totalDiscount = 0;

    // Agrupar por producto para aplicar la promoción
    const itemsByProduct = applicableItems.reduce((groups, item) => {
      const key = item.productId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, any[]>);

    Object.values(itemsByProduct).forEach((productItems: any[]) => {
      const totalQuantity = productItems.reduce((sum, item) => sum + item.quantity, 0);
      const setsAvailable = Math.floor(totalQuantity / (promotion.buyQuantity! + promotion.getQuantity!));

      if (setsAvailable > 0) {
        const freeItems = setsAvailable * promotion.getQuantity!;
        const itemPrice = productItems[0].price;
        
        totalDiscount += freeItems * itemPrice;
      }
    });

    return {
      discountAmount: totalDiscount,
      description: `Compra ${promotion.buyQuantity} lleva ${promotion.getQuantity} gratis`
    };
  }

  private async applyCoupon(
    couponCode: string,
    userId: string,
    cartItems: any[],
    totalAmount: number
  ): Promise<{
    promotionId: string;
    promotionName: string;
    type: string;
    discountAmount: number;
    discountPercentage?: number;
    description: string;
  }> {
    const validation = await this.validateCoupon(couponCode, userId);
    
    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    const coupon = validation.coupon;
    const promotion = coupon.promotionId as any;

    // Validar compra mínima del cupón
    if (coupon.minimumPurchaseAmount && totalAmount < coupon.minimumPurchaseAmount) {
      throw new BadRequestException(`Compra mínima de $${coupon.minimumPurchaseAmount} requerida`);
    }

    // Calcular descuento usando la promoción asociada
    const discount = this.calculatePromotionDiscount(promotion, cartItems, totalAmount);

    return {
      promotionId: promotion._id.toString(),
      promotionName: promotion.name,
      type: promotion.type,
      discountAmount: discount.discountAmount,
      discountPercentage: promotion.discountPercentage,
      description: discount.description,
    };
  }

  // ===== CRON JOBS =====

  @Cron(CronExpression.EVERY_HOUR)
  async updatePromotionStatuses(): Promise<void> {
    try {
      this.logger.log('Actualizando estados de promociones');

      const now = new Date();

      // Expirar promociones que terminaron
      await this.promotionModel.updateMany(
        {
          status: PromotionStatus.ACTIVE,
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

      this.logger.log('Estados de promociones actualizados');

    } catch (error) {
      this.logger.error('Error actualizando estados de promociones:', error);
    }
  }
}

