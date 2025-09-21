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
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@Roles('admin')
export class AdminSimpleController {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Review.name) private reviewModel: Model<Review>,
  ) {}

  // ===== DASHBOARD PRINCIPAL =====

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
      ] = await Promise.all([
        this.userModel.countDocuments({}),
        this.productModel.countDocuments({}),
        this.orderModel.countDocuments({}),
        this.calculateTotalRevenue(),
        this.orderModel.countDocuments({ createdAt: { $gte: todayStart } }),
        this.orderModel.countDocuments({ status: 'pending' }),
        this.productModel.countDocuments({ stock: { $lte: 10, $gt: 0 } }),
        this.reviewModel.countDocuments({ status: 'pending' }),
      ]);

      return {
        metrics: {
          users: { total: totalUsers },
          products: { total: totalProducts, lowStock: lowStockProducts },
          orders: { total: totalOrders, today: todayOrders, pending: pendingOrders },
          revenue: { total: Math.round(totalRevenue * 100) / 100 },
          reviews: { pending: pendingReviews },
        },
        alerts: this.generateSimpleAlerts(lowStockProducts, pendingOrders, pendingReviews),
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // ===== GESTIÓN DE PRODUCTOS =====

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

  @Get('products/low-stock')
  async getLowStockProducts() {
    return this.productModel.find({
      stock: { $lte: 10, $gt: 0 },
    }).sort({ stock: 1 }).exec();
  }

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
}
