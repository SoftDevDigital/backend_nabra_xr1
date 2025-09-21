import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewStatus, ReviewFlag } from './schemas/review.schema';
import { CreateReviewDto } from './dtos/create-review.dto';
import { UpdateReviewDto } from './dtos/update-review.dto';
import { ModerateReviewDto, AdminResponseDto, FlagReviewDto, ReviewHelpfulnessDto } from './dtos/admin-review.dto';
import { ReviewQueryDto, ReviewSortBy } from './dtos/review-query.dto';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedReviewsCount: number;
  photosCount: number;
  recentReviewsCount: number; // Últimos 30 días
}

export interface ReviewSummary {
  review: Review;
  isHelpful?: boolean; // Para el usuario actual
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  // Palabras prohibidas para moderación automática
  private readonly spamKeywords = [
    'spam', 'fake', 'bot', 'promoción', 'descuento gratis', 
    'click aquí', 'compra ahora', 'oferta especial'
  ];

  private readonly inappropriateWords = [
    'idiota', 'estúpido', 'basura', 'mierda', 'pésimo servicio'
  ];

  constructor(
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @Inject(forwardRef(() => OrdersService)) private ordersService: OrdersService,
    @Inject(forwardRef(() => ProductsService)) private productsService: ProductsService,
  ) {}

  // ===== CREACIÓN Y GESTIÓN DE RESEÑAS =====

  async createReview(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    try {
      this.logger.log(`Creating review for product ${createReviewDto.productId} by user ${userId}`);

      // 1. Verificar que el usuario compró el producto
      await this.verifyPurchase(userId, createReviewDto.productId, createReviewDto.orderId);

      // 2. Verificar que no existe una reseña previa para esta orden
      const existingReview = await this.reviewModel.findOne({
        productId: createReviewDto.productId,
        userId,
        orderId: createReviewDto.orderId,
      });

      if (existingReview) {
        throw new ConflictException('You have already reviewed this product for this order');
      }

      // 3. Obtener información de la orden para datos adicionales
      const order = await this.ordersService.getUserOrderById(userId, createReviewDto.orderId);
      const orderItem = order.items.find(item => 
        item.product._id?.toString() === createReviewDto.productId ||
        item.product.toString() === createReviewDto.productId
      );

      // 4. Moderación automática
      const moderationResult = await this.performAutoModeration(createReviewDto);

      // 5. Crear la reseña
      const review = new this.reviewModel({
        ...createReviewDto,
        userId,
        status: moderationResult.status,
        isVerifiedPurchase: true,
        purchaseDate: (order as any).createdAt,
        purchaseVariant: orderItem?.size || createReviewDto.purchaseVariant,
        qualityScore: moderationResult.qualityScore,
        moderationInfo: moderationResult.moderationInfo,
      });

      await review.save();

      // 6. Actualizar estadísticas del producto
      await this.updateProductReviewStats(createReviewDto.productId);

      this.logger.log(`Review created successfully: ${review._id}`);
      return review;

    } catch (error) {
      this.logger.error('Error creating review:', error);
      throw error;
    }
  }

  async updateReview(reviewId: string, userId: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
    try {
      const review = await this.reviewModel.findOne({ _id: reviewId, userId });
      
      if (!review) {
        throw new NotFoundException('Review not found');
      }

      // Solo permitir editar reseñas en estado pending o approved
      if (![ReviewStatus.PENDING, ReviewStatus.APPROVED].includes(review.status)) {
        throw new ForbiddenException('Review cannot be edited in current status');
      }

      // Re-moderar si se cambió el contenido
      if (updateReviewDto.content || updateReviewDto.title) {
        const moderationResult = await this.performAutoModeration({
          ...updateReviewDto,
          productId: review.productId.toString(),
          orderId: review.orderId.toString(),
          rating: updateReviewDto.rating || review.rating,
          title: updateReviewDto.title || review.title,
          content: updateReviewDto.content || review.content,
        });

        review.status = moderationResult.status;
        review.qualityScore = moderationResult.qualityScore;
        review.moderationInfo = moderationResult.moderationInfo;
      }

      // Actualizar campos
      Object.assign(review, updateReviewDto);
      await review.save();

      // Actualizar estadísticas del producto
      await this.updateProductReviewStats(review.productId.toString());

      this.logger.log(`Review updated: ${reviewId}`);
      return review;

    } catch (error) {
      this.logger.error('Error updating review:', error);
      throw error;
    }
  }

  async deleteReview(reviewId: string, userId: string): Promise<void> {
    try {
      const review = await this.reviewModel.findOne({ _id: reviewId, userId });
      
      if (!review) {
        throw new NotFoundException('Review not found');
      }

      await this.reviewModel.findByIdAndDelete(reviewId);

      // Actualizar estadísticas del producto
      await this.updateProductReviewStats(review.productId.toString());

      this.logger.log(`Review deleted: ${reviewId}`);

    } catch (error) {
      this.logger.error('Error deleting review:', error);
      throw error;
    }
  }

  // ===== CONSULTAS DE RESEÑAS =====

  async getReviews(query: ReviewQueryDto): Promise<{ reviews: ReviewSummary[]; total: number; stats: any }> {
    try {
      const filter: any = {};

      // Aplicar filtros
      if (query.productId) filter.productId = query.productId;
      if (query.userId) filter.userId = query.userId;
      if (query.rating) filter.rating = query.rating;
      if (query.status) filter.status = query.status;
      if (query.verifiedOnly) filter.isVerifiedPurchase = true;
      if (query.withPhotos) filter['photos.0'] = { $exists: true };

      // Solo mostrar reseñas visibles por defecto
      if (!query.status) {
        filter.status = ReviewStatus.APPROVED;
        filter.isVisible = true;
      }

      // Búsqueda de texto
      if (query.search) {
        filter.$text = { $search: query.search };
      }

      // Configurar ordenamiento
      const sort = this.buildSortQuery(query.sortBy);

      // Ejecutar consulta
      const reviews = await this.reviewModel
        .find(filter)
        .populate('userId', 'name')
        .populate('productId', 'name images')
        .sort(sort)
        .limit(query.limit || 10)
        .skip(query.offset || 0)
        .exec();

      const total = await this.reviewModel.countDocuments(filter);

      // Preparar respuesta con información adicional
      const reviewSummaries: ReviewSummary[] = reviews.map(review => ({
        review,
        canEdit: false, // Se determinará por el usuario actual
        canDelete: false, // Se determinará por el usuario actual
        canReport: true,
      }));

      // Estadísticas básicas
      const stats = query.productId ? await this.getProductReviewStats(query.productId) : null;

      return { reviews: reviewSummaries, total, stats };

    } catch (error) {
      this.logger.error('Error getting reviews:', error);
      throw new BadRequestException(`Failed to get reviews: ${error.message}`);
    }
  }

  async getReviewById(reviewId: string, userId?: string): Promise<ReviewSummary> {
    try {
      const review = await this.reviewModel
        .findById(reviewId)
        .populate('userId', 'name')
        .populate('productId', 'name images price')
        .exec();

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      // Verificar permisos
      const canEdit = userId === review.userId.toString();
      const canDelete = userId === review.userId.toString();
      const isHelpful = userId ? await this.getUserHelpfulnessVote(reviewId, userId) : undefined;

      // Incrementar contador de vistas
      if (review.status === ReviewStatus.APPROVED) {
        review.viewCount += 1;
        review.lastViewedAt = new Date();
        await review.save();
      }

      return {
        review,
        isHelpful,
        canEdit,
        canDelete,
        canReport: !!userId && userId !== review.userId.toString(),
      };

    } catch (error) {
      this.logger.error('Error getting review by ID:', error);
      throw error;
    }
  }

  async getProductReviewStats(productId: string): Promise<ReviewStats> {
    try {
      const pipeline = [
        { 
          $match: { 
            productId: productId,
            status: ReviewStatus.APPROVED,
            isVisible: true 
          } 
        },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            verifiedReviewsCount: { 
              $sum: { $cond: ['$isVerifiedPurchase', 1, 0] } 
            },
            photosCount: { 
              $sum: { $size: { $ifNull: ['$photos', []] } } 
            },
            ratingCounts: {
              $push: '$rating'
            },
          }
        }
      ];

      const result = await this.reviewModel.aggregate(pipeline);
      const data = result[0] || {
        totalReviews: 0,
        averageRating: 0,
        verifiedReviewsCount: 0,
        photosCount: 0,
        ratingCounts: [],
      };

      // Calcular distribución de calificaciones
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      data.ratingCounts.forEach((rating: number) => {
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      });

      // Contar reseñas recientes (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentReviewsCount = await this.reviewModel.countDocuments({
        productId,
        status: ReviewStatus.APPROVED,
        createdAt: { $gte: thirtyDaysAgo },
      });

      return {
        totalReviews: data.totalReviews,
        averageRating: Math.round(data.averageRating * 10) / 10, // 1 decimal
        ratingDistribution,
        verifiedReviewsCount: data.verifiedReviewsCount,
        photosCount: data.photosCount,
        recentReviewsCount,
      };

    } catch (error) {
      this.logger.error('Error getting product review stats:', error);
      throw new BadRequestException(`Failed to get review stats: ${error.message}`);
    }
  }

  // ===== INTERACCIONES CON RESEÑAS =====

  async voteHelpfulness(reviewId: string, userId: string, voteDto: ReviewHelpfulnessDto): Promise<void> {
    try {
      const review = await this.reviewModel.findById(reviewId);
      
      if (!review) {
        throw new NotFoundException('Review not found');
      }

      if (review.userId.toString() === userId) {
        throw new BadRequestException('Cannot vote on your own review');
      }

      // Remover voto anterior si existe
      review.helpfulnessVotes = review.helpfulnessVotes.filter(
        vote => vote.userId.toString() !== userId
      );

      // Agregar nuevo voto
      review.helpfulnessVotes.push({
        userId: userId as any,
        isHelpful: voteDto.isHelpful,
        votedAt: new Date(),
      });

      // Recalcular contadores
      review.helpfulCount = review.helpfulnessVotes.filter(vote => vote.isHelpful).length;
      review.notHelpfulCount = review.helpfulnessVotes.filter(vote => !vote.isHelpful).length;

      await review.save();
      this.logger.log(`Helpfulness vote recorded for review ${reviewId}`);

    } catch (error) {
      this.logger.error('Error voting helpfulness:', error);
      throw error;
    }
  }

  async flagReview(reviewId: string, userId: string, flagDto: FlagReviewDto): Promise<void> {
    try {
      const review = await this.reviewModel.findById(reviewId);
      
      if (!review) {
        throw new NotFoundException('Review not found');
      }

      if (review.userId.toString() === userId) {
        throw new BadRequestException('Cannot flag your own review');
      }

      // Verificar si ya reportó esta reseña
      const existingFlag = review.flags.find(flag => flag.userId.toString() === userId);
      if (existingFlag) {
        throw new ConflictException('You have already flagged this review');
      }

      // Agregar flag
      review.flags.push({
        userId: userId as any,
        flag: flagDto.flag,
        reason: flagDto.reason,
        reportedAt: new Date(),
      });

      review.reportCount = review.flags.length;

      // Auto-moderar si hay muchos reportes
      if (review.reportCount >= 3 && review.status === ReviewStatus.APPROVED) {
        review.status = ReviewStatus.FLAGGED;
        review.moderationInfo = {
          moderatedAt: new Date(),
          moderationReason: 'Auto-flagged due to multiple reports',
          autoModerationScore: 90,
          detectedIssues: ['multiple_reports'],
        };
      }

      await review.save();
      this.logger.log(`Review flagged: ${reviewId} by user ${userId}`);

    } catch (error) {
      this.logger.error('Error flagging review:', error);
      throw error;
    }
  }

  // ===== FUNCIONES ADMINISTRATIVAS =====

  async moderateReview(reviewId: string, moderatorId: string, moderateDto: ModerateReviewDto): Promise<Review> {
    try {
      const review = await this.reviewModel.findById(reviewId);
      
      if (!review) {
        throw new NotFoundException('Review not found');
      }

      review.status = moderateDto.status;
      review.moderationInfo = {
        moderatedAt: new Date(),
        moderatedBy: moderatorId as any,
        moderationReason: moderateDto.moderationReason,
        autoModerationScore: review.moderationInfo?.autoModerationScore || 0,
        detectedIssues: review.moderationInfo?.detectedIssues || [],
      };

      await review.save();

      // Actualizar estadísticas del producto
      await this.updateProductReviewStats(review.productId.toString());

      this.logger.log(`Review moderated: ${reviewId} -> ${moderateDto.status}`);
      return review;

    } catch (error) {
      this.logger.error('Error moderating review:', error);
      throw error;
    }
  }

  async addAdminResponse(reviewId: string, adminId: string, responseDto: AdminResponseDto): Promise<Review> {
    try {
      const review = await this.reviewModel.findById(reviewId);
      
      if (!review) {
        throw new NotFoundException('Review not found');
      }

      review.adminResponse = {
        content: responseDto.content,
        respondedBy: adminId as any,
        respondedAt: new Date(),
        isVisible: responseDto.isVisible !== false,
      };

      await review.save();
      this.logger.log(`Admin response added to review: ${reviewId}`);
      return review;

    } catch (error) {
      this.logger.error('Error adding admin response:', error);
      throw error;
    }
  }

  async toggleReviewFeatured(reviewId: string): Promise<Review> {
    try {
      const review = await this.reviewModel.findById(reviewId);
      
      if (!review) {
        throw new NotFoundException('Review not found');
      }

      review.isFeatured = !review.isFeatured;
      await review.save();

      this.logger.log(`Review featured status toggled: ${reviewId} -> ${review.isFeatured}`);
      return review;

    } catch (error) {
      this.logger.error('Error toggling featured status:', error);
      throw error;
    }
  }

  // ===== MODERACIÓN AUTOMÁTICA =====

  private async performAutoModeration(reviewData: any): Promise<{
    status: ReviewStatus;
    qualityScore: number;
    moderationInfo: any;
  }> {
    let qualityScore = 100;
    const detectedIssues: string[] = [];
    const content = `${reviewData.title} ${reviewData.content}`.toLowerCase();

    // Detectar spam
    const spamScore = this.detectSpam(content);
    if (spamScore > 50) {
      qualityScore -= spamScore;
      detectedIssues.push('potential_spam');
    }

    // Detectar contenido inapropiado
    const inappropriateScore = this.detectInappropriateContent(content);
    if (inappropriateScore > 30) {
      qualityScore -= inappropriateScore;
      detectedIssues.push('inappropriate_content');
    }

    // Detectar reseñas muy cortas o genéricas
    if (reviewData.content.length < 20) {
      qualityScore -= 20;
      detectedIssues.push('too_short');
    }

    // Detectar patrones de reseñas falsas
    if (this.detectFakePatterns(reviewData)) {
      qualityScore -= 40;
      detectedIssues.push('fake_review_pattern');
    }

    // Determinar estado basado en score
    let status = ReviewStatus.APPROVED;
    if (qualityScore < 30) {
      status = ReviewStatus.REJECTED;
    } else if (qualityScore < 60) {
      status = ReviewStatus.PENDING;
    }

    return {
      status,
      qualityScore: Math.max(0, qualityScore),
      moderationInfo: {
        moderatedAt: new Date(),
        moderationReason: detectedIssues.length > 0 
          ? `Auto-moderation detected: ${detectedIssues.join(', ')}`
          : 'Auto-approved',
        autoModerationScore: qualityScore,
        detectedIssues,
      },
    };
  }

  private detectSpam(content: string): number {
    let spamScore = 0;
    
    this.spamKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        spamScore += 20;
      }
    });

    // Detectar muchos enlaces o caracteres especiales
    const linkCount = (content.match(/http[s]?:\/\//g) || []).length;
    spamScore += linkCount * 30;

    // Detectar repetición excesiva de caracteres
    if (/(.)\1{4,}/.test(content)) {
      spamScore += 25;
    }

    return Math.min(spamScore, 100);
  }

  private detectInappropriateContent(content: string): number {
    let score = 0;
    
    this.inappropriateWords.forEach(word => {
      if (content.includes(word)) {
        score += 25;
      }
    });

    return Math.min(score, 100);
  }

  private detectFakePatterns(reviewData: any): boolean {
    // Detectar reseñas demasiado genéricas
    const genericPhrases = [
      'muy bueno', 'excelente producto', 'lo recomiendo',
      'buena calidad', 'llegó rápido', 'tal como se describe'
    ];

    const content = reviewData.content.toLowerCase();
    const genericCount = genericPhrases.filter(phrase => content.includes(phrase)).length;

    return genericCount >= 3 && reviewData.content.length < 100;
  }

  private buildSortQuery(sortBy?: ReviewSortBy): any {
    switch (sortBy) {
      case ReviewSortBy.NEWEST:
        return { createdAt: -1 };
      case ReviewSortBy.OLDEST:
        return { createdAt: 1 };
      case ReviewSortBy.HIGHEST_RATING:
        return { rating: -1, createdAt: -1 };
      case ReviewSortBy.LOWEST_RATING:
        return { rating: 1, createdAt: -1 };
      case ReviewSortBy.MOST_HELPFUL:
        return { helpfulCount: -1, createdAt: -1 };
      case ReviewSortBy.VERIFIED_ONLY:
        return { isVerifiedPurchase: -1, createdAt: -1 };
      default:
        return { helpfulCount: -1, createdAt: -1 }; // Por defecto: más útiles primero
    }
  }

  // ===== VERIFICACIONES =====

  private async verifyPurchase(userId: string, productId: string, orderId: string): Promise<void> {
    try {
      const order = await this.ordersService.getUserOrderById(userId, orderId);
      
      if (!order) {
        throw new BadRequestException('Order not found');
      }

      if (order.status !== 'paid') {
        throw new BadRequestException('Can only review products from paid orders');
      }

      // Verificar que el producto está en la orden
      const hasProduct = order.items.some(item => 
        item.product._id?.toString() === productId ||
        item.product.toString() === productId
      );

      if (!hasProduct) {
        throw new BadRequestException('Product not found in the specified order');
      }

    } catch (error) {
      this.logger.error('Error verifying purchase:', error);
      throw error;
    }
  }

  private async getUserHelpfulnessVote(reviewId: string, userId: string): Promise<boolean | undefined> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) return undefined;

    const vote = review.helpfulnessVotes.find(vote => vote.userId.toString() === userId);
    return vote?.isHelpful;
  }

  private async updateProductReviewStats(productId: string): Promise<void> {
    try {
      const stats = await this.getProductReviewStats(productId);
      
      // Actualizar el producto con las nuevas estadísticas
      await this.productsService.update(productId, {
        reviewStats: {
          totalReviews: stats.totalReviews,
          averageRating: stats.averageRating,
          ratingDistribution: stats.ratingDistribution,
        }
      } as any, { role: 'admin' }); // Bypass admin check para updates automáticos

    } catch (error) {
      this.logger.error('Error updating product review stats:', error);
      // No lanzar error para no afectar la operación principal
    }
  }

  // ===== MÉTODOS PARA USUARIOS =====

  async getUserReviews(userId: string, limit: number = 10, offset: number = 0): Promise<Review[]> {
    return this.reviewModel
      .find({ userId })
      .populate('productId', 'name images price')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .exec();
  }

  async canUserReviewProduct(userId: string, productId: string): Promise<{
    canReview: boolean;
    reason?: string;
    eligibleOrders?: string[];
  }> {
    try {
      // Obtener órdenes pagadas del usuario que contienen este producto
      const userOrders = await this.ordersService.getUserOrders(userId, 100, 0);
      const eligibleOrders = userOrders.filter(order => 
        order.status === 'paid' &&
        order.items.some(item => 
          item.product._id?.toString() === productId ||
          item.product.toString() === productId
        )
      );

      if (eligibleOrders.length === 0) {
        return {
          canReview: false,
          reason: 'You must purchase this product before reviewing it',
        };
      }

      // Verificar si ya reseñó todos los pedidos de este producto
      const existingReviews = await this.reviewModel.find({
        userId,
        productId,
      });

      const reviewedOrderIds = existingReviews.map(review => review.orderId.toString());
      const unreviewedOrders = eligibleOrders.filter(order => 
        !reviewedOrderIds.includes((order._id as any).toString())
      );

      if (unreviewedOrders.length === 0) {
        return {
          canReview: false,
          reason: 'You have already reviewed this product for all your purchases',
        };
      }

      return {
        canReview: true,
        eligibleOrders: unreviewedOrders.map(order => (order._id as any).toString()),
      };

    } catch (error) {
      this.logger.error('Error checking review eligibility:', error);
      return {
        canReview: false,
        reason: 'Error checking review eligibility',
      };
    }
  }

  // ===== ESTADÍSTICAS GENERALES =====

  async getReviewStatistics(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const matchStage: any = {};
    
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = dateFrom;
      if (dateTo) matchStage.createdAt.$lte = dateTo;
    }

    const stats = await this.reviewModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          avgQualityScore: { $avg: '$qualityScore' },
        },
      },
    ]);

    return stats;
  }
}
