import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Promotion, PromotionType, PromotionStatus, PromotionTarget } from './schemas/promotion.schema';
import { Coupon, CouponStatus } from './schemas/coupon.schema';
import { ApplyDiscountDto, DiscountResult, CartItemForDiscountDto } from './dtos/apply-discount.dto';

export interface DiscountCalculation {
  promotionId: string;
  promotionName: string;
  type: PromotionType;
  discountAmount: number;
  discountPercentage?: number;
  appliedToItems: string[]; // IDs de productos afectados
  couponCode?: string;
  description: string;
}

export interface CartSummaryWithDiscounts {
  originalSubtotal: number;
  discounts: DiscountCalculation[];
  totalDiscount: number;
  subtotalAfterDiscounts: number;
  shippingCost: number;
  shippingDiscount: number;
  finalTotal: number;
  savings: number;
  appliedPromotions: string[];
}

@Injectable()
export class DiscountCalculatorService {
  private readonly logger = new Logger(DiscountCalculatorService.name);

  constructor(
    @InjectModel(Promotion.name) private promotionModel: Model<Promotion>,
    @InjectModel(Coupon.name) private couponModel: Model<Coupon>,
  ) {}

  // ===== CALCULADORA PRINCIPAL =====

  async calculateDiscounts(
    userId: string,
    applyDiscountDto: ApplyDiscountDto,
  ): Promise<DiscountResult> {
    try {
      this.logger.log(`Calculating discounts for user: ${userId}`);

      const { cartItems, totalAmount, couponCode } = applyDiscountDto;
      const appliedPromotions: DiscountCalculation[] = [];
      let totalDiscount = 0;
      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. Obtener promociones automáticas activas
      const automaticPromotions = await this.getActiveAutomaticPromotions(userId, cartItems);

      // 2. Aplicar promociones automáticas
      for (const promotion of automaticPromotions) {
        try {
          const discount = await this.calculatePromotionDiscount(
            promotion,
            cartItems,
            totalAmount,
            userId
          );

          if (discount.discountAmount > 0) {
            appliedPromotions.push(discount);
            totalDiscount += discount.discountAmount;
          }
        } catch (error) {
          warnings.push(`Error applying automatic promotion ${promotion.name}: ${error.message}`);
        }
      }

      // 3. Aplicar cupón si se proporciona
      if (couponCode) {
        try {
          const couponDiscount = await this.applyCoupon(
            couponCode,
            userId,
            cartItems,
            totalAmount
          );

          if (couponDiscount.discountAmount > 0) {
            appliedPromotions.push(couponDiscount);
            totalDiscount += couponDiscount.discountAmount;
          }
        } catch (error) {
          errors.push(`Coupon error: ${error.message}`);
        }
      }

      // 4. Resolver conflictos entre promociones (aplicar la mejor)
      const optimizedPromotions = this.optimizePromotions(appliedPromotions, totalAmount);
      const finalDiscount = optimizedPromotions.reduce((sum, p) => sum + p.discountAmount, 0);

      const finalTotal = Math.max(0, totalAmount - finalDiscount);

      return {
        success: errors.length === 0,
        appliedPromotions: optimizedPromotions.map(p => ({
          promotionId: p.promotionId,
          promotionName: p.promotionName,
          type: p.type,
          discountAmount: Math.round(p.discountAmount * 100) / 100,
          discountPercentage: p.discountPercentage,
          couponCode: p.couponCode,
          description: p.description,
        })),
        totalDiscount: Math.round(finalDiscount * 100) / 100,
        originalTotal: Math.round(totalAmount * 100) / 100,
        finalTotal: Math.round(finalTotal * 100) / 100,
        savings: Math.round(finalDiscount * 100) / 100,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };

    } catch (error) {
      this.logger.error('Error calculating discounts:', error);
      throw new BadRequestException(`Failed to calculate discounts: ${error.message}`);
    }
  }

  // ===== PROMOCIONES AUTOMÁTICAS =====

  private async getActiveAutomaticPromotions(
    userId: string,
    cartItems: CartItemForDiscountDto[],
  ): Promise<Promotion[]> {
    const now = new Date();

    // Buscar promociones automáticas activas
    const promotions = await this.promotionModel.find({
      status: PromotionStatus.ACTIVE,
      isActive: true,
      isAutomatic: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ priority: -1 }).exec();

    // Filtrar promociones aplicables
    const applicablePromotions: any[] = [];

    for (const promotion of promotions) {
      if (await this.isPromotionApplicable(promotion, userId, cartItems)) {
        applicablePromotions.push(promotion);
      }
    }

    return applicablePromotions;
  }

  private async isPromotionApplicable(
    promotion: Promotion,
    userId: string,
    cartItems: CartItemForDiscountDto[],
  ): Promise<boolean> {
    const { conditions } = promotion;

    // Verificar cantidad mínima
    if (conditions.minimumQuantity) {
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQuantity < conditions.minimumQuantity) return false;
    }

    // Verificar productos específicos
    if (conditions.specificProducts && conditions.specificProducts.length > 0) {
      const hasRequiredProduct = cartItems.some(item =>
        conditions.specificProducts!.some(prodId => prodId.toString() === item.productId)
      );
      if (!hasRequiredProduct) return false;
    }

    // Verificar categorías
    if (conditions.categories && conditions.categories.length > 0) {
      const hasRequiredCategory = cartItems.some(item =>
        conditions.categories!.includes(item.category)
      );
      if (!hasRequiredCategory) return false;
    }

    // Verificar límites de uso
    if (conditions.maxUsesPerUser) {
      const userUsages = promotion.usageHistory.filter(
        usage => usage.userId.toString() === userId
      ).length;
      if (userUsages >= conditions.maxUsesPerUser) return false;
    }

    if (conditions.maxTotalUses && promotion.totalUses >= conditions.maxTotalUses) {
      return false;
    }

    return true;
  }

  // ===== CÁLCULO DE DESCUENTOS POR TIPO =====

  private async calculatePromotionDiscount(
    promotion: Promotion,
    cartItems: CartItemForDiscountDto[],
    totalAmount: number,
    userId: string,
  ): Promise<DiscountCalculation> {
    const { type, rules, name } = promotion;

    let discountAmount = 0;
    let discountPercentage: number | undefined;
    let appliedToItems: string[] = [];
    let description = '';

    switch (type) {
      case PromotionType.PERCENTAGE:
        ({ discountAmount, appliedToItems, description } = this.calculatePercentageDiscount(
          promotion, cartItems, totalAmount
        ));
        discountPercentage = rules.discountPercentage;
        break;

      case PromotionType.FIXED_AMOUNT:
        ({ discountAmount, appliedToItems, description } = this.calculateFixedAmountDiscount(
          promotion, cartItems, totalAmount
        ));
        break;

      case PromotionType.FREE_SHIPPING:
        ({ discountAmount, description } = this.calculateFreeShippingDiscount(promotion, totalAmount));
        break;

      case PromotionType.BUY_X_GET_Y:
        ({ discountAmount, appliedToItems, description } = this.calculateBuyXGetYDiscount(
          promotion, cartItems
        ));
        break;

      case PromotionType.QUANTITY_DISCOUNT:
        ({ discountAmount, appliedToItems, description } = this.calculateQuantityDiscount(
          promotion, cartItems
        ));
        break;

      case PromotionType.CATEGORY_DISCOUNT:
        ({ discountAmount, appliedToItems, description } = this.calculateCategoryDiscount(
          promotion, cartItems
        ));
        discountPercentage = rules.discountPercentage;
        break;

      case PromotionType.MINIMUM_PURCHASE:
        ({ discountAmount, appliedToItems, description } = this.calculateMinimumPurchaseDiscount(
          promotion, cartItems, totalAmount
        ));
        break;

      default:
        description = 'Tipo de promoción no soportado';
    }

    // Aplicar límites máximos/mínimos
    if (rules.maxDiscountAmount && discountAmount > rules.maxDiscountAmount) {
      discountAmount = rules.maxDiscountAmount;
      description += ` (limitado a $${rules.maxDiscountAmount})`;
    }

    if (rules.minDiscountAmount && discountAmount < rules.minDiscountAmount) {
      discountAmount = 0;
      description = `Descuento mínimo no alcanzado ($${rules.minDiscountAmount})`;
    }

    return {
      promotionId: (promotion._id as any).toString(),
      promotionName: name,
      type,
      discountAmount,
      discountPercentage,
      appliedToItems,
      description,
    };
  }

  private calculatePercentageDiscount(
    promotion: Promotion,
    cartItems: CartItemForDiscountDto[],
    totalAmount: number,
  ) {
    const percentage = promotion.rules.discountPercentage || 0;
    const applicableItems = this.getApplicableItems(promotion, cartItems);
    
    const applicableTotal = applicableItems.reduce(
      (sum, item) => sum + (item.price * item.quantity), 0
    );

    const discountAmount = (applicableTotal * percentage) / 100;
    const appliedToItems = applicableItems.map(item => item.cartItemId);

    return {
      discountAmount,
      appliedToItems,
      description: `${percentage}% de descuento en productos seleccionados`,
    };
  }

  private calculateFixedAmountDiscount(
    promotion: Promotion,
    cartItems: CartItemForDiscountDto[],
    totalAmount: number,
  ) {
    const discountAmount = Math.min(promotion.rules.discountAmount || 0, totalAmount);
    const appliedToItems = cartItems.map(item => item.cartItemId);

    return {
      discountAmount,
      appliedToItems,
      description: `$${discountAmount} de descuento`,
    };
  }

  private calculateFreeShippingDiscount(promotion: Promotion, totalAmount: number) {
    // El descuento de envío se calculará en el servicio de shipping
    // Por ahora retornamos 0 y lo marcamos como aplicado
    return {
      discountAmount: 0, // Se calculará en shipping
      description: 'Envío gratis aplicado',
    };
  }

  private calculateBuyXGetYDiscount(promotion: Promotion, cartItems: CartItemForDiscountDto[]) {
    const { buyQuantity = 1, getQuantity = 1, getDiscountPercentage = 100 } = promotion.rules;
    const applicableItems = this.getApplicableItems(promotion, cartItems);

    let totalDiscount = 0;
    const appliedToItems: string[] = [];

    // Agrupar por producto para aplicar la promoción
    const itemsByProduct = this.groupItemsByProduct(applicableItems);

    Object.values(itemsByProduct).forEach((productItems: any) => {
      const totalQuantity = productItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const setsAvailable = Math.floor(totalQuantity / (buyQuantity + getQuantity));

      if (setsAvailable > 0) {
        const freeItems = setsAvailable * getQuantity;
        const itemPrice = productItems[0].price;
        const discountPerItem = (itemPrice * getDiscountPercentage) / 100;
        
        totalDiscount += freeItems * discountPerItem;
        appliedToItems.push(...productItems.map((item: any) => item.cartItemId));
      }
    });

    return {
      discountAmount: totalDiscount,
      appliedToItems,
      description: `Compra ${buyQuantity} lleva ${getQuantity} con ${getDiscountPercentage}% descuento`,
    };
  }

  private calculateQuantityDiscount(promotion: Promotion, cartItems: CartItemForDiscountDto[]) {
    const { quantityTiers = [] } = promotion.rules;
    const applicableItems = this.getApplicableItems(promotion, cartItems);
    
    const totalQuantity = applicableItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Encontrar el tier aplicable más alto
    const applicableTier = quantityTiers
      .filter(tier => totalQuantity >= tier.quantity)
      .sort((a, b) => b.quantity - a.quantity)[0];

    if (!applicableTier) {
      return {
        discountAmount: 0,
        appliedToItems: [],
        description: 'Cantidad insuficiente para descuento',
      };
    }

    const applicableTotal = applicableItems.reduce(
      (sum, item) => sum + (item.price * item.quantity), 0
    );

    const discountAmount = applicableTier.discountType === 'percentage'
      ? (applicableTotal * applicableTier.discount) / 100
      : applicableTier.discount;

    return {
      discountAmount,
      appliedToItems: applicableItems.map(item => item.cartItemId),
      description: `${applicableTier.discount}${applicableTier.discountType === 'percentage' ? '%' : '$'} descuento por ${applicableTier.quantity}+ items`,
    };
  }

  private calculateCategoryDiscount(promotion: Promotion, cartItems: CartItemForDiscountDto[]) {
    const percentage = promotion.rules.discountPercentage || 0;
    const { categories = [] } = promotion.conditions;
    
    const applicableItems = cartItems.filter(item => 
      categories.includes(item.category)
    );

    const applicableTotal = applicableItems.reduce(
      (sum, item) => sum + (item.price * item.quantity), 0
    );

    const discountAmount = (applicableTotal * percentage) / 100;

    return {
      discountAmount,
      appliedToItems: applicableItems.map(item => item.cartItemId),
      description: `${percentage}% descuento en ${categories.join(', ')}`,
    };
  }

  private calculateMinimumPurchaseDiscount(
    promotion: Promotion,
    cartItems: CartItemForDiscountDto[],
    totalAmount: number,
  ) {
    const { minimumPurchaseAmount = 0 } = promotion.conditions;
    
    if (totalAmount < minimumPurchaseAmount) {
      return {
        discountAmount: 0,
        appliedToItems: [],
        description: `Compra mínima de $${minimumPurchaseAmount} requerida`,
      };
    }

    const discountAmount = promotion.rules.discountAmount || 
      ((totalAmount * (promotion.rules.discountPercentage || 0)) / 100);

    return {
      discountAmount,
      appliedToItems: cartItems.map(item => item.cartItemId),
      description: `Descuento por compra mínima de $${minimumPurchaseAmount}`,
    };
  }

  // ===== APLICACIÓN DE CUPONES =====

  async applyCoupon(
    couponCode: string,
    userId: string,
    cartItems: CartItemForDiscountDto[],
    totalAmount: number,
  ): Promise<DiscountCalculation> {
    const coupon = await this.couponModel
      .findOne({ code: couponCode.toUpperCase() })
      .populate('promotionId')
      .exec();

    if (!coupon) {
      throw new BadRequestException('Cupón no encontrado');
    }

    // Validar estado del cupón
    if (coupon.status !== CouponStatus.ACTIVE || !coupon.isActive) {
      throw new BadRequestException('Cupón no válido o inactivo');
    }

    // Validar fechas
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      throw new BadRequestException('Cupón expirado o aún no válido');
    }

    // Validar compra mínima
    if (coupon.minimumPurchaseAmount && totalAmount < coupon.minimumPurchaseAmount) {
      throw new BadRequestException(`Compra mínima de $${coupon.minimumPurchaseAmount} requerida`);
    }

    // Validar cantidad mínima de items
    if (coupon.requiresMinimumItems && coupon.minimumItems) {
      const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      if (totalItems < coupon.minimumItems) {
        throw new BadRequestException(`Mínimo ${coupon.minimumItems} productos requeridos`);
      }
    }

    // Validar límites de uso
    if (coupon.maxUsesPerUser) {
      const userUsages = coupon.usageHistory.filter(
        usage => usage.userId.toString() === userId
      ).length;
      if (userUsages >= coupon.maxUsesPerUser) {
        throw new BadRequestException('Límite de usos por usuario alcanzado');
      }
    }

    if (coupon.maxUses && coupon.totalUses >= coupon.maxUses) {
      throw new BadRequestException('Límite total de usos alcanzado');
    }

    // Validar usuario específico
    if (coupon.specificUserId && coupon.specificUserId.toString() !== userId) {
      throw new BadRequestException('Cupón no válido para este usuario');
    }

    // Calcular descuento de la promoción asociada
    const promotion = coupon.promotionId as any;
    const discount = await this.calculatePromotionDiscount(
      promotion,
      cartItems,
      totalAmount,
      userId
    );

    return {
      ...discount,
      couponCode: coupon.code,
      description: `Cupón ${coupon.code}: ${discount.description}`,
    };
  }

  // ===== MÉTODOS AUXILIARES =====

  private getApplicableItems(
    promotion: Promotion,
    cartItems: CartItemForDiscountDto[],
  ): CartItemForDiscountDto[] {
    const { conditions } = promotion;

    let applicableItems = [...cartItems];

    // Filtrar por productos específicos
    if (conditions.specificProducts && conditions.specificProducts.length > 0) {
      applicableItems = applicableItems.filter(item =>
        conditions.specificProducts!.some(prodId => prodId.toString() === item.productId)
      );
    }

    // Filtrar por categorías
    if (conditions.categories && conditions.categories.length > 0) {
      applicableItems = applicableItems.filter(item =>
        conditions.categories!.includes(item.category)
      );
    }

    // Excluir items ya con descuento (si está configurado)
    if (conditions.excludeDiscountedItems) {
      // TODO: Implementar lógica para excluir items ya con descuento
    }

    return applicableItems;
  }

  private groupItemsByProduct(items: CartItemForDiscountDto[]): Record<string, CartItemForDiscountDto[]> {
    return items.reduce((groups, item) => {
      const key = item.productId;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, CartItemForDiscountDto[]>);
  }

  private optimizePromotions(
    promotions: DiscountCalculation[],
    totalAmount: number,
  ): DiscountCalculation[] {
    // Si no hay promociones, retornar array vacío
    if (promotions.length === 0) return [];

    // Si solo hay una promoción, retornarla
    if (promotions.length === 1) return promotions;

    // Ordenar por descuento descendente y tomar la mejor
    // En el futuro se puede implementar lógica más compleja para combinar promociones
    const sortedPromotions = promotions.sort((a, b) => b.discountAmount - a.discountAmount);
    
    // Por ahora, aplicar solo la mejor promoción
    return [sortedPromotions[0]];
  }

  // ===== VALIDACIÓN DE CUPONES =====

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

      // Validaciones específicas del usuario
      if (userId) {
        if (coupon.specificUserId && coupon.specificUserId.toString() !== userId) {
          return {
            valid: false,
            coupon,
            message: 'Cupón no válido para este usuario',
          };
        }

        if (coupon.maxUsesPerUser) {
          const userUsages = coupon.usageHistory.filter(
            usage => usage.userId.toString() === userId
          ).length;
          
          if (userUsages >= coupon.maxUsesPerUser) {
            return {
              valid: false,
              coupon,
              message: 'Límite de usos por usuario alcanzado',
            };
          }
        }
      }

      return {
        valid: true,
        coupon,
        promotion: coupon.promotionId,
        message: 'Cupón válido',
      };

    } catch (error) {
      this.logger.error('Error validating coupon:', error);
      return {
        valid: false,
        message: 'Error validando cupón',
      };
    }
  }

  // ===== PROMOCIONES ACTIVAS =====

  async getActivePromotions(userId?: string): Promise<Promotion[]> {
    const now = new Date();

    const query: any = {
      status: PromotionStatus.ACTIVE,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    // Solo promociones públicas o automáticas para usuarios no específicos
    if (!userId) {
      query.isAutomatic = true;
    }

    return this.promotionModel
      .find(query)
      .sort({ priority: -1, createdAt: -1 })
      .exec();
  }

  async getPublicCoupons(): Promise<Coupon[]> {
    const now = new Date();

    return this.couponModel
      .find({
        status: CouponStatus.ACTIVE,
        isActive: true,
        isPublic: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
        type: { $in: ['multi_use', 'public'] },
      })
      .populate('promotionId', 'name description type')
      .sort({ createdAt: -1 })
      .exec();
  }
}
