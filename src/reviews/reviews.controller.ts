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
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dtos/create-review.dto';
import { UpdateReviewDto } from './dtos/update-review.dto';
import { ModerateReviewDto, AdminResponseDto, FlagReviewDto, ReviewHelpfulnessDto } from './dtos/admin-review.dto';
import { ReviewQueryDto } from './dtos/review-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  // ===== ENDPOINTS PÚBLICOS =====

  @Public()
  @Get('product/:productId')
  async getProductReviews(
    @Param('productId') productId: string,
    @Query() query: ReviewQueryDto,
  ) {
    const reviewQuery = { ...query, productId };
    return this.reviewsService.getReviews(reviewQuery);
  }

  @Public()
  @Get('product/:productId/stats')
  async getProductReviewStats(@Param('productId') productId: string) {
    return this.reviewsService.getProductReviewStats(productId);
  }

  @Public()
  @Get(':reviewId')
  async getReview(@Param('reviewId') reviewId: string, @Request() req) {
    const userId = req.user?.userId; // Puede ser undefined si no está autenticado
    return this.reviewsService.getReviewById(reviewId, userId);
  }

  @Public()
  @Get('featured/all')
  async getFeaturedReviews(@Query() query: ReviewQueryDto) {
    const reviewQuery = { ...query, status: 'approved' as any };
    // TODO: Filtrar solo featured reviews
    return this.reviewsService.getReviews(reviewQuery);
  }

  // ===== ENDPOINTS DE USUARIO =====

  @Get('my-reviews')
  async getUserReviews(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const limitNum = limit ? parseInt(limit.toString(), 10) : 10;
    const offsetNum = offset ? parseInt(offset.toString(), 10) : 0;

    if (limitNum < 1 || limitNum > 50) {
      throw new BadRequestException('Limit must be between 1 and 50');
    }

    return this.reviewsService.getUserReviews(req.user.userId, limitNum, offsetNum);
  }

  @Get('can-review/:productId')
  async canReviewProduct(@Request() req, @Param('productId') productId: string) {
    return this.reviewsService.canUserReviewProduct(req.user.userId, productId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReview(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.createReview(req.user.userId, createReviewDto);
  }

  @Put(':reviewId')
  async updateReview(
    @Request() req,
    @Param('reviewId') reviewId: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(reviewId, req.user.userId, updateReviewDto);
  }

  @Delete(':reviewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(@Request() req, @Param('reviewId') reviewId: string) {
    await this.reviewsService.deleteReview(reviewId, req.user.userId);
  }

  // ===== INTERACCIONES =====

  @Post(':reviewId/helpful')
  @HttpCode(HttpStatus.OK)
  async voteHelpfulness(
    @Request() req,
    @Param('reviewId') reviewId: string,
    @Body() voteDto: ReviewHelpfulnessDto,
  ) {
    await this.reviewsService.voteHelpfulness(reviewId, req.user.userId, voteDto);
    return { message: 'Vote recorded successfully' };
  }

  @Post(':reviewId/flag')
  @HttpCode(HttpStatus.OK)
  async flagReview(
    @Request() req,
    @Param('reviewId') reviewId: string,
    @Body() flagDto: FlagReviewDto,
  ) {
    await this.reviewsService.flagReview(reviewId, req.user.userId, flagDto);
    return { message: 'Review flagged successfully' };
  }

  // ===== ENDPOINTS ADMINISTRATIVOS =====

  @Roles('admin')
  @Get('admin/pending')
  async getPendingReviews(@Query() query: ReviewQueryDto) {
    const reviewQuery = { ...query, status: 'pending' as any };
    return this.reviewsService.getReviews(reviewQuery);
  }

  @Roles('admin')
  @Get('admin/flagged')
  async getFlaggedReviews(@Query() query: ReviewQueryDto) {
    const reviewQuery = { ...query, status: 'flagged' as any };
    return this.reviewsService.getReviews(reviewQuery);
  }

  @Roles('admin')
  @Get('admin/statistics')
  async getReviewStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;
    
    return this.reviewsService.getReviewStatistics(from, to);
  }

  @Roles('admin')
  @Put('admin/:reviewId/moderate')
  async moderateReview(
    @Request() req,
    @Param('reviewId') reviewId: string,
    @Body() moderateDto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderateReview(reviewId, req.user.userId, moderateDto);
  }

  @Roles('admin')
  @Post(':reviewId/admin-response')
  async addAdminResponse(
    @Request() req,
    @Param('reviewId') reviewId: string,
    @Body() responseDto: AdminResponseDto,
  ) {
    return this.reviewsService.addAdminResponse(reviewId, req.user.userId, responseDto);
  }

  @Roles('admin')
  @Put('admin/:reviewId/toggle-featured')
  async toggleFeatured(@Param('reviewId') reviewId: string) {
    return this.reviewsService.toggleReviewFeatured(reviewId);
  }

  // ===== BÚSQUEDAS Y FILTROS =====

  @Public()
  @Get('search')
  async searchReviews(@Query() query: ReviewQueryDto) {
    if (!query.search) {
      throw new BadRequestException('Search query is required');
    }
    return this.reviewsService.getReviews(query);
  }

  @Public()
  @Get('filter/rating/:rating')
  async getReviewsByRating(
    @Param('rating') rating: number,
    @Query() query: ReviewQueryDto,
  ) {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const reviewQuery = { ...query, rating };
    return this.reviewsService.getReviews(reviewQuery);
  }

  @Public()
  @Get('filter/verified')
  async getVerifiedReviews(@Query() query: ReviewQueryDto) {
    const reviewQuery = { ...query, verifiedOnly: true };
    return this.reviewsService.getReviews(reviewQuery);
  }

  @Public()
  @Get('filter/with-photos')
  async getReviewsWithPhotos(@Query() query: ReviewQueryDto) {
    const reviewQuery = { ...query, withPhotos: true };
    return this.reviewsService.getReviews(reviewQuery);
  }

  // ===== ENDPOINTS DE UTILIDAD =====

  @Public()
  @Get('summary/recent')
  async getRecentReviewsSummary(@Query('limit') limit?: number) {
    const limitNum = Math.min(limit || 5, 20);
    
    const query: ReviewQueryDto = {
      status: 'approved' as any,
      sortBy: 'newest' as any,
      limit: limitNum,
      offset: 0,
    };

    return this.reviewsService.getReviews(query);
  }

  @Public()
  @Get('summary/top-rated')
  async getTopRatedReviews(@Query('limit') limit?: number) {
    const limitNum = Math.min(limit || 5, 20);
    
    const query: ReviewQueryDto = {
      status: 'approved' as any,
      sortBy: 'highest_rating' as any,
      limit: limitNum,
      offset: 0,
    };

    return this.reviewsService.getReviews(query);
  }
}
