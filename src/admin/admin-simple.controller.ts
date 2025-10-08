import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/schemas/user.schema';
import { Product } from '../products/schemas/product.schema';
import { Order } from '../orders/schemas/order.schema';
import { Payment } from '../payments/schemas/payment.schema';
import { Review } from '../reviews/schemas/review.schema';
import { Promotion } from '../promotions/schemas/promotion.schema';
import { Coupon } from '../promotions/schemas/coupon.schema';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Controller('admin')
@Roles('admin')
export class AdminSimpleController {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(Promotion.name) private promotionModel: Model<Promotion>,
    @InjectModel(Coupon.name) private couponModel: Model<Coupon>,
  ) {}

  // ===== DASHBOARD PRINCIPAL =====

  @ApiOperation({ summary: 'Dashboard', description: 'Métricas generales del panel admin (usuarios, órdenes, ingresos, etc.).' })
  @Get('dashboard')
  async getDashboard() {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        todayOrders,
        pendingOrders,
        lowStockProducts,
        pendingReviews,
        activePromotions,
        activeCoupons,
      ] = await Promise.all([
        this.userModel.countDocuments({}),
        this.productModel.countDocuments({}),
        this.orderModel.countDocuments({}),
        this.calculateTotalRevenue(),
        this.orderModel.countDocuments({ createdAt: { $gte: todayStart } }),
        this.orderModel.countDocuments({ status: 'pending' }),
        this.productModel.countDocuments({ stock: { $lte: 10, $gt: 0 } }),
        this.reviewModel.countDocuments({ status: 'pending' }),
        this.promotionModel.countDocuments({ status: 'active' }),
        this.couponModel.countDocuments({ status: 'active' }),
      ]);

      return {
        metrics: {
          users: { total: totalUsers },
          products: { total: totalProducts, lowStock: lowStockProducts },
          orders: { total: totalOrders, today: todayOrders, pending: pendingOrders },
          revenue: { total: Math.round(totalRevenue * 100) / 100 },
          reviews: { pending: pendingReviews },
          promotions: { active: activePromotions },
          coupons: { active: activeCoupons },
        },
        alerts: this.generateSimpleAlerts(lowStockProducts, pendingOrders, pendingReviews),
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // ===== GESTIÓN DE PRODUCTOS =====

  @ApiOperation({ summary: 'Listar productos', description: 'Listado de productos con filtros y paginación.' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @Get('products')
  async getProducts(@Query() query: any) {
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = parseInt(query.offset) || 0;

    const filter: any = {};
    if (query.category) filter.category = query.category;
    if (query.search) filter.name = { $regex: query.search, $options: 'i' };

    const [products, total] = await Promise.all([
      this.productModel.find(filter).limit(limit).skip(offset).exec(),
      this.productModel.countDocuments(filter),
    ]);

    return { products, total, limit, offset };
  }

  @ApiOperation({ summary: 'Stock bajo', description: 'Productos con stock por debajo del umbral.' })
  @Get('products/low-stock')
  async getLowStockProducts() {
    return this.productModel.find({
      stock: { $lte: 10, $gt: 0 },
    }).sort({ stock: 1 }).exec();
  }

  @ApiOperation({ summary: 'Actualizar stock', description: 'Actualiza el stock de un producto.' })
  @ApiParam({ name: 'productId', description: 'ID del producto' })
  @Put('products/:productId/stock')
  async updateProductStock(
    @Param('productId') productId: string,
    @Body() body: { stock: number },
  ) {
    const product = await this.productModel.findByIdAndUpdate(
      productId,
      { stock: body.stock },
      { new: true }
    );

    return { success: true, product };
  }

  @ApiOperation({ summary: 'Alternar destacado', description: 'Alterna el flag de destacado de un producto.' })
  @ApiParam({ name: 'productId', description: 'ID del producto' })
  @Put('products/:productId/toggle-featured')
  async toggleProductFeatured(@Param('productId') productId: string) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      return { error: 'Product not found' };
    }

    product.isFeatured = !product.isFeatured;
    await product.save();

    return { success: true, isFeatured: product.isFeatured };
  }

  // ===== GESTIÓN DE USUARIOS =====

  @ApiOperation({ summary: 'Listar usuarios', description: 'Obtiene usuarios con filtros y paginación.' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'search', required: false })
  @Get('users')
  async getUsers(@Query() query: any) {
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = parseInt(query.offset) || 0;

    const filter: any = {};
    if (query.role) filter.role = query.role;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel.find(filter).select('-password').limit(limit).skip(offset).exec(),
      this.userModel.countDocuments(filter),
    ]);

    return { users, total, limit, offset };
  }

  @ApiOperation({ summary: 'Órdenes de usuario', description: 'Lista las órdenes de un usuario.' })
  @ApiParam({ name: 'userId', description: 'ID del usuario' })
  @Get('users/:userId/orders')
  async getUserOrders(@Param('userId') userId: string) {
    const orders = await this.orderModel
      .find({ userId })
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();

    const summary = await this.orderModel.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0] } },
        },
      },
    ]);

    return {
      orders,
      summary: summary[0] || { totalOrders: 0, totalSpent: 0 },
    };
  }

  // ===== GESTIÓN DE ÓRDENES =====

  @ApiOperation({ summary: 'Listar órdenes', description: 'Listado de órdenes con filtros y paginación.' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @Get('orders')
  async getOrders(@Query() query: any) {
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = parseInt(query.offset) || 0;

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.dateFrom) {
      filter.createdAt = { $gte: new Date(query.dateFrom) };
    }

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('userId', 'name email')
        .populate('items.product', 'name price')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec(),
      this.orderModel.countDocuments(filter),
    ]);

    return { orders, total, limit, offset };
  }

  @ApiOperation({ summary: 'Actualizar estado de orden', description: 'Actualiza el estado de una orden.' })
  @ApiParam({ name: 'orderId', description: 'ID de la orden' })
  @Put('orders/:orderId/status')
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() body: { status: string },
  ) {
    const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(body.status)) {
      return { error: 'Invalid status' };
    }

    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      { status: body.status },
      { new: true }
    );

    return { success: true, order };
  }

  // ===== GESTIÓN DE RESEÑAS =====

  @ApiOperation({ summary: 'Reseñas pendientes', description: 'Listado de reseñas pendientes de moderación.' })
  @Get('reviews/pending')
  async getPendingReviews() {
    return this.reviewModel
      .find({ status: 'pending' })
      .populate('userId', 'name email')
      .populate('productId', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  @ApiOperation({ summary: 'Moderar reseña', description: 'Actualiza el estado de moderación de una reseña.' })
  @ApiParam({ name: 'reviewId', description: 'ID de la reseña' })
  @Put('reviews/:reviewId/moderate')
  async moderateReview(
    @Param('reviewId') reviewId: string,
    @Body() body: { status: string; reason?: string },
  ) {
    const validStatuses = ['approved', 'rejected', 'flagged'];
    
    if (!validStatuses.includes(body.status)) {
      return { error: 'Invalid status' };
    }

    const review = await this.reviewModel.findByIdAndUpdate(
      reviewId,
      { 
        status: body.status,
        'moderationInfo.moderatedAt': new Date(),
        'moderationInfo.moderationReason': body.reason,
      },
      { new: true }
    );

    return { success: true, review };
  }

  // ===== ESTADÍSTICAS RÁPIDAS =====

  @ApiOperation({ summary: 'Estadísticas rápidas', description: 'KPIs rápidos para el panel admin.' })
  @Get('stats/quick')
  async getQuickStats() {
    try {
      const [
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        avgRating,
      ] = await Promise.all([
        this.userModel.countDocuments({}),
        this.productModel.countDocuments({}),
        this.orderModel.countDocuments({ status: 'paid' }),
        this.calculateTotalRevenue(),
        this.calculateAverageRating(),
      ]);

      return {
        users: totalUsers,
        products: totalProducts,
        orders: totalOrders,
        revenue: Math.round(totalRevenue * 100) / 100,
        averageRating: Math.round(avgRating * 10) / 10,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  private async calculateTotalRevenue(): Promise<number> {
    const result = await this.orderModel.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    return result[0]?.total || 0;
  }

  private async calculateAverageRating(): Promise<number> {
    const result = await this.reviewModel.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);

    return result[0]?.avg || 0;
  }

  private generateSimpleAlerts(lowStock: number, pendingOrders: number, pendingReviews: number) {
    const alerts: string[] = [];

    if (lowStock > 0) {
      alerts.push(`${lowStock} productos con stock bajo`);
    }

    if (pendingOrders > 0) {
      alerts.push(`${pendingOrders} órdenes pendientes`);
    }

    if (pendingReviews > 0) {
      alerts.push(`${pendingReviews} reseñas por moderar`);
    }

    return alerts;
  }

  // ===== GESTIÓN DE PROMOCIONES =====

  @ApiOperation({ summary: 'Listar promociones', description: 'Listado paginado de promociones.' })
  @Get('promotions')
  async getPromotions(@Query() query: any) {
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = parseInt(query.offset) || 0;

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;

    const [promotions, total] = await Promise.all([
      this.promotionModel.find(filter).limit(limit).skip(offset).sort({ createdAt: -1 }).exec(),
      this.promotionModel.countDocuments(filter),
    ]);

    return { promotions, total, limit, offset };
  }

  @ApiOperation({ summary: 'Obtener promoción', description: 'Detalle de una promoción por ID.' })
  @ApiParam({ name: 'promotionId', description: 'ID de la promoción' })
  @Get('promotions/:promotionId')
  async getPromotionById(@Param('promotionId') promotionId: string) {
    const promotion = await this.promotionModel.findById(promotionId);
    if (!promotion) {
      return { error: 'Promotion not found' };
    }
    return promotion;
  }

  @ApiOperation({ summary: 'Cambiar estado de promoción', description: 'Actualiza el estado de una promoción.' })
  @ApiParam({ name: 'promotionId', description: 'ID de la promoción' })
  @Put('promotions/:promotionId/status')
  async changePromotionStatus(
    @Param('promotionId') promotionId: string,
    @Body() body: { status: string },
  ) {
    const validStatuses = ['draft', 'active', 'paused', 'expired', 'cancelled'];
    
    if (!validStatuses.includes(body.status)) {
      return { error: 'Invalid status' };
    }

    const promotion = await this.promotionModel.findByIdAndUpdate(
      promotionId,
      { status: body.status },
      { new: true }
    );

    return { success: true, promotion };
  }

  @ApiOperation({ summary: 'Listar cupones', description: 'Listado de cupones con filtros.' })
  @Get('coupons')
  async getCoupons(@Query() query: any) {
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = parseInt(query.offset) || 0;

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.promotionId) filter.promotionId = query.promotionId;

    const [coupons, total] = await Promise.all([
      this.couponModel
        .find(filter)
        .populate('promotionId', 'name type')
        .limit(limit)
        .skip(offset)
        .sort({ createdAt: -1 })
        .exec(),
      this.couponModel.countDocuments(filter),
    ]);

    return { coupons, total, limit, offset };
  }

  @ApiOperation({ summary: 'Resumen de promociones', description: 'Resumen de uso y descuentos entregados.' })
  @Get('promotions/stats/summary')
  async getPromotionStatsSummary() {
    try {
      const [
        totalPromotions,
        activePromotions,
        totalCoupons,
        activeCoupons,
        usageStats,
      ] = await Promise.all([
        this.promotionModel.countDocuments({}),
        this.promotionModel.countDocuments({ status: 'active' }),
        this.couponModel.countDocuments({}),
        this.couponModel.countDocuments({ status: 'active' }),
        this.getPromotionUsageStats(),
      ]);

      return {
        promotions: { total: totalPromotions, active: activePromotions },
        coupons: { total: totalCoupons, active: activeCoupons },
        usage: usageStats,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  private async getPromotionUsageStats() {
    const result = await this.promotionModel.aggregate([
      {
        $group: {
          _id: null,
          totalUses: { $sum: '$totalUses' },
          totalDiscountGiven: { $sum: '$totalDiscountGiven' },
        },
      },
    ]);

    return result[0] || { totalUses: 0, totalDiscountGiven: 0 };
  }
}
