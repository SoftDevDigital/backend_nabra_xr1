import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Promotion } from '../schemas/promotion.schema';
import { Document } from 'mongoose';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotificationType, NotificationChannel } from '../../notifications/schemas/notification.schema';

export interface CartPromotionUpdate {
  userId: string;
  productId: string;
  promotionId: string;
  promotionName: string;
  discountAmount: number;
  originalPrice: number;
  discountedPrice: number;
  appliedAt: Date;
}

@Injectable()
export class CartPromotionService {
  private readonly logger = new Logger(CartPromotionService.name);

  constructor(
    @InjectModel(Promotion.name) private promotionModel: Model<Promotion & Document>,
    private notificationsService: NotificationsService,
  ) {}

  // ===== APLICAR PROMOCIONES A CARRITOS EXISTENTES =====

  async applyPromotionToExistingCarts(promotionId: string): Promise<CartPromotionUpdate[]> {
    try {
      const promotion = await this.promotionModel.findById(promotionId);
      if (!promotion) {
        throw new Error('Promotion not found');
      }

      if (!promotion.retroactiveApplication) {
        this.logger.log(`Promotion ${promotionId} does not have retroactive application enabled`);
        return [];
      }

      this.logger.log(`Applying promotion ${promotion.name} to existing carts`);

      // Obtener todos los carritos que tienen productos elegibles
      const eligibleCarts = await this.getEligibleCarts(promotion);
      
      const updates: CartPromotionUpdate[] = [];

      for (const cart of eligibleCarts) {
        const cartUpdates = await this.applyPromotionToCart(cart, promotion);
        updates.push(...cartUpdates);

        // Notificar al usuario si está habilitado
        if (promotion.notifyCartUsers) {
          await this.notifyUserAboutPromotion(cart.userId, promotion, cartUpdates);
        }
      }

      this.logger.log(`Applied promotion to ${updates.length} cart items across ${eligibleCarts.length} carts`);
      return updates;

    } catch (error) {
      this.logger.error(`Error applying promotion to existing carts:`, error);
      throw error;
    }
  }

  // ===== APLICAR PROMOCIONES AUTOMÁTICAMENTE AL AGREGAR PRODUCTOS =====

  async applyPromotionsToNewCartItem(
    userId: string, 
    productId: string, 
    quantity: number, 
    price: number
  ): Promise<CartPromotionUpdate[]> {
    try {
      // Buscar promociones activas que se apliquen automáticamente
      const activePromotions = await this.promotionModel.find({
        status: 'active',
        isActive: true,
        autoApplyToCart: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
        $or: [
          { 'conditions.specificProducts': { $in: [productId] } },
          { 'conditions.categories': { $exists: true } }, // Se validará después
        ]
      }).sort({ priority: -1 });

      const updates: CartPromotionUpdate[] = [];

      for (const promotion of activePromotions) {
        if (await this.isPromotionApplicableToProduct(promotion, userId, productId, quantity)) {
          const discount = await this.calculateProductDiscount(promotion, productId, quantity, price);
          
          if (discount > 0) {
            updates.push({
              userId,
              productId,
              promotionId: (promotion._id as any).toString(),
              promotionName: promotion.name,
              discountAmount: discount,
              originalPrice: price * quantity,
              discountedPrice: (price * quantity) - discount,
              appliedAt: new Date(),
            });
          }
        }
      }

      return updates;

    } catch (error) {
      this.logger.error(`Error applying promotions to new cart item:`, error);
      return [];
    }
  }

  // ===== ACTUALIZAR DESCUENTOS EN TIEMPO REAL =====

  async updateCartDiscountsInRealTime(userId: string): Promise<CartPromotionUpdate[]> {
    try {
      // Obtener carrito del usuario
      const cartItems = await this.getUserCartItems(userId);
      
      // Buscar promociones que se actualicen en tiempo real
      const realTimePromotions = await this.promotionModel.find({
        status: 'active',
        isActive: true,
        realTimeUpdate: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      }).sort({ priority: -1 });

      const updates: CartPromotionUpdate[] = [];

      for (const promotion of realTimePromotions) {
        for (const cartItem of cartItems) {
          if (await this.isPromotionApplicableToProduct(promotion, userId, cartItem.productId, cartItem.quantity)) {
            const discount = await this.calculateProductDiscount(
              promotion, 
              cartItem.productId, 
              cartItem.quantity, 
              cartItem.price
            );

            if (discount > 0) {
              updates.push({
                userId,
                productId: cartItem.productId,
                promotionId: (promotion._id as any).toString(),
                promotionName: promotion.name,
                discountAmount: discount,
                originalPrice: cartItem.price * cartItem.quantity,
                discountedPrice: (cartItem.price * cartItem.quantity) - discount,
                appliedAt: new Date(),
              });
            }
          }
        }
      }

      return updates;

    } catch (error) {
      this.logger.error(`Error updating cart discounts in real time:`, error);
      return [];
    }
  }

  // ===== MÉTODOS PRIVADOS =====

  private async getEligibleCarts(promotion: Promotion): Promise<any[]> {
    // En producción, implementar consulta real a la base de datos
    // Por ahora, simulamos la obtención de carritos elegibles
    return [];
  }

  private async applyPromotionToCart(cart: any, promotion: Promotion): Promise<CartPromotionUpdate[]> {
    const updates: CartPromotionUpdate[] = [];

    // Lógica para aplicar promoción a carrito específico
    // En producción, implementar cálculo real de descuentos

    return updates;
  }

  private async isPromotionApplicableToProduct(
    promotion: Promotion, 
    userId: string, 
    productId: string, 
    quantity: number
  ): Promise<boolean> {
    // Validar condiciones de la promoción
    const conditions = promotion.conditions;

    // Verificar productos específicos
    if (conditions.specificProducts && conditions.specificProducts.length > 0) {
      if (!conditions.specificProducts.map(p => p.toString()).includes(productId)) {
        return false;
      }
    }

    // Verificar cantidad mínima
    if (conditions.minimumQuantity && quantity < conditions.minimumQuantity) {
      return false;
    }

    // Verificar usuarios específicos
    if (conditions.specificUsers && conditions.specificUsers.length > 0) {
      if (!conditions.specificUsers.map(u => u.toString()).includes(userId)) {
        return false;
      }
    }

    // Verificar segmento de usuario
    if (conditions.userSegment) {
      // En producción, implementar lógica de segmentación
    }

    // Verificar límites de uso
    if (conditions.maxUsesPerUser || conditions.maxTotalUses) {
      // En producción, verificar historial de uso
    }

    return true;
  }

  private async calculateProductDiscount(
    promotion: Promotion, 
    productId: string, 
    quantity: number, 
    price: number
  ): Promise<number> {
    const rules = promotion.rules;
    let discount = 0;

    switch (promotion.type) {
      case 'percentage':
        if (rules.discountPercentage) {
          discount = (price * quantity * rules.discountPercentage) / 100;
        }
        break;

      case 'fixed_amount':
        if (rules.discountAmount) {
          discount = Math.min(rules.discountAmount, price * quantity);
        }
        break;

      case 'buy_x_get_y':
        if (rules.buyQuantity && rules.getQuantity && quantity >= rules.buyQuantity) {
          const freeItems = Math.floor(quantity / rules.buyQuantity) * rules.getQuantity;
          discount = freeItems * price;
        }
        break;

      case 'pay_x_get_y':
        if (rules.payQuantity && rules.getTotalQuantity && quantity >= rules.payQuantity) {
          const paidItems = Math.floor(quantity / rules.getTotalQuantity) * rules.payQuantity;
          const freeItems = quantity - paidItems;
          discount = freeItems * price;
        }
        break;

      case 'progressive_quantity_discount':
        if (rules.progressiveTiers) {
          for (let i = 0; i < quantity && i < rules.progressiveTiers.length; i++) {
            const tier = rules.progressiveTiers[i];
            if (tier.discountType === 'percentage') {
              discount += price * (tier.discount / 100);
            } else {
              discount += tier.discount;
            }
          }
        }
        break;

      case 'quantity_discount':
        if (rules.quantityTiers) {
          for (const tier of rules.quantityTiers) {
            if (quantity >= tier.quantity) {
              if (tier.discountType === 'percentage') {
                discount = (price * quantity * tier.discount) / 100;
              } else {
                discount = tier.discount;
              }
              break;
            }
          }
        }
        break;
    }

    // Aplicar límites
    if (rules.maxDiscountAmount) {
      discount = Math.min(discount, rules.maxDiscountAmount);
    }

    if (rules.minDiscountAmount && discount < rules.minDiscountAmount) {
      discount = 0;
    }

    return Math.round(discount * 100) / 100; // Redondear a 2 decimales
  }

  private async getUserCartItems(userId: string): Promise<any[]> {
    // En producción, obtener items reales del carrito
    // Por ahora, simulamos
    return [];
  }

  private async notifyUserAboutPromotion(
    userId: string, 
    promotion: Promotion, 
    updates: CartPromotionUpdate[]
  ): Promise<void> {
    try {
      const totalDiscount = updates.reduce((sum, update) => sum + update.discountAmount, 0);
      
      await this.notificationsService.createNotification({
        userId,
        type: NotificationType.PROMOTION,
        channel: NotificationChannel.EMAIL,
        title: `¡Nueva promoción aplicada a tu carrito!`,
        content: `La promoción "${promotion.name}" ha sido aplicada a ${updates.length} productos en tu carrito. Ahorraste $${totalDiscount.toFixed(2)}.`,
        data: {
          promotionId: (promotion._id as any).toString(),
          promotionName: promotion.name,
          totalDiscount,
          affectedItems: updates.length,
        },
        priority: 'MEDIUM' as any,
      });

      this.logger.log(`Notified user ${userId} about promotion ${promotion.name}`);
    } catch (error) {
      this.logger.error(`Error notifying user about promotion:`, error);
    }
  }
}
