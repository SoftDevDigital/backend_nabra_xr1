import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, ClientSession } from 'mongoose';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { SimplePromotionsService } from '../promotions/simple-promotions.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectConnection() private connection: Connection,
    @Inject(forwardRef(() => SimplePromotionsService)) 
    private promotionsService: SimplePromotionsService,
  ) {}

  async findAll(query: any): Promise<{ products: Product[]; total: number; page: number; totalPages: number }> {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      search,
      minPrice, 
      maxPrice, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      isFeatured,
      isPreorder,
      size
    } = query;
    
    const skip = (page - 1) * limit;
    const filter: any = {};

    // Filtro por categoría (insensible a mayúsculas)
    if (category) {
      filter.category = { $regex: new RegExp(category, 'i') };
    }

    // Búsqueda de texto
    if (search) {
      filter.$text = { $search: search };
    }

    // Filtros de precio
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Filtros booleanos
    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === 'true';
    }

    if (isPreorder !== undefined) {
      filter.isPreorder = isPreorder === 'true';
    }

    // Filtro por talla
    if (size) {
      filter.sizes = { $in: [size] };
    }

    // Construir ordenamiento
    const sort: any = {};
    if (search && sortBy === 'relevance') {
      sort.score = { $meta: 'textScore' };
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Ejecutar consulta con conteo total
    const [products, total] = await Promise.all([
      this.productModel
        .find(filter, search && sortBy === 'relevance' ? { score: { $meta: 'textScore' } } : {})
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      this.productModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    return {
      products,
      total,
      page: Number(page),
      totalPages
    };
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async search(query: string): Promise<Product[]> {
    return this.productModel
      .find({ $text: { $search: query } })
      .limit(10)
      .exec();
  }

  async findPreorders(): Promise<Product[]> {
    return this.productModel.find({ isPreorder: true }).exec();
  }

  async findFeatured(): Promise<Product[]> {
    return this.productModel.find({ isFeatured: true }).limit(5).exec();
  }

  async create(
    createProductDto: CreateProductDto,
    user: any,
  ): Promise<Product> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can create products');
    }
    const product = new this.productModel(createProductDto);
    return product.save();
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    user: any,
  ): Promise<Product> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can update products');
    }
    const product = await this.productModel.findByIdAndUpdate(
      id,
      { $set: updateProductDto },
      { new: true, runValidators: true },
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async delete(id: string, user: any): Promise<void> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete products');
    }
    const product = await this.productModel.findByIdAndDelete(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  async addImage(id: string, imageUrl: string, user: any): Promise<Product> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can add images');
    }
    const product = await this.productModel.findByIdAndUpdate(
      id,
      { $push: { images: imageUrl } },
      { new: true, runValidators: true },
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  // ===== GESTIÓN DE STOCK =====
  
  async checkStockAvailability(productId: string, requiredQuantity: number): Promise<{ available: boolean; currentStock: number; message?: string }> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (product.isPreorder) {
      return {
        available: true,
        currentStock: product.stock,
        message: 'Preorder item - stock validation bypassed'
      };
    }

    const available = product.stock >= requiredQuantity;
    return {
      available,
      currentStock: product.stock,
      message: available ? undefined : `Insufficient stock. Available: ${product.stock}, Required: ${requiredQuantity}`
    };
  }

  async reserveStock(productId: string, quantity: number, session?: ClientSession): Promise<void> {
    const product = await this.productModel.findById(productId).session(session || null);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (!product.isPreorder && product.stock < quantity) {
      throw new BadRequestException(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Required: ${quantity}`);
    }

    if (!product.isPreorder) {
      product.stock -= quantity;
      await product.save({ session });
    }
  }

  async releaseStock(productId: string, quantity: number, session?: ClientSession): Promise<void> {
    const product = await this.productModel.findById(productId).session(session || null);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (!product.isPreorder) {
      product.stock += quantity;
      await product.save({ session });
    }
  }

  async bulkReserveStock(items: { productId: string; quantity: number }[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    const reservations: { productId: string; quantity: number }[] = [];

    // Primero validamos todo el stock (sin transacción, solo lectura)
    for (const item of items) {
      try {
        const stockCheck = await this.checkStockAvailability(item.productId, item.quantity);
        if (!stockCheck.available) {
          errors.push(`${stockCheck.message}`);
        } else {
          reservations.push(item);
        }
      } catch (error) {
        errors.push(`Product ${item.productId}: ${error.message}`);
      }
    }

    // Si hay errores de validación, no reservamos nada
    if (errors.length > 0) {
      return { success: false, errors };
    }

    // ✅ TRANSACCIÓN: Reservamos todo el stock de forma atómica
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      this.logger.log(`🔒 [TRANSACTION] Starting bulk stock reservation for ${reservations.length} items`);
      
      for (const reservation of reservations) {
        await this.reserveStock(reservation.productId, reservation.quantity, session);
      }

      // Si todo salió bien, commitear la transacción
      await session.commitTransaction();
      this.logger.log(`✅ [TRANSACTION] Bulk stock reservation completed successfully`);
      
      return { success: true, errors: [] };

    } catch (error) {
      // Si algo falla, hacer rollback automático
      await session.abortTransaction();
      this.logger.error(`❌ [TRANSACTION] Bulk stock reservation failed, rolling back:`, error);
      
      return { 
        success: false, 
        errors: [`Stock reservation failed: ${error.message}. All changes have been rolled back.`] 
      };

    } finally {
      // Siempre cerrar la sesión
      session.endSession();
    }
  }

  async getStockStatus(productId: string): Promise<{ stock: number; isPreorder: boolean; isAvailable: boolean }> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return {
      stock: product.stock,
      isPreorder: product.isPreorder,
      isAvailable: product.isPreorder || product.stock > 0
    };
  }

  // ===== GESTIÓN DE CATEGORÍAS =====

  async findAllCategories(): Promise<{ category: string; count: number }[]> {
    const categories = await this.productModel.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { category: 1 }
      }
    ]);

    return categories;
  }


  async getCategoryStats(category: string): Promise<{
    category: string;
    totalProducts: number;
    priceRange: { min: number; max: number };
    averagePrice: number;
    availableSizes: string[];
    featuredProducts: number;
    preorderProducts: number;
  }> {
    const stats = await this.productModel.aggregate([
      { $match: { category: { $regex: new RegExp(category, 'i') } } },
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          averagePrice: { $avg: '$price' },
          sizes: { $addToSet: '$sizes' },
          featuredProducts: { $sum: { $cond: ['$isFeatured', 1, 0] } },
          preorderProducts: { $sum: { $cond: ['$isPreorder', 1, 0] } }
        }
      },
      {
        $project: {
          category: '$_id',
          totalProducts: 1,
          priceRange: {
            min: '$minPrice',
            max: '$maxPrice'
          },
          averagePrice: { $round: ['$averagePrice', 2] },
          availableSizes: {
            $reduce: {
              input: '$sizes',
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] }
            }
          },
          featuredProducts: 1,
          preorderProducts: 1,
          _id: 0
        }
      }
    ]);

    if (stats.length === 0) {
      throw new NotFoundException(`Category '${category}' not found`);
    }

    return stats[0];
  }

  // ===== MÉTODOS CON PROMOCIONES =====

  async findByIdWithPromotions(productId: string): Promise<Product & { 
    originalPrice: number; 
    discountAmount: number; 
    finalPrice: number; 
    hasPromotion: boolean; 
    promotionName?: string;
  }> {
    const product = await this.findById(productId);
    
    try {
      const promotions = await this.promotionsService.getPromotionsByProduct(productId);
      const activePromotion = promotions.find(p => p.isActive);
      
      if (activePromotion) {
        const discount = this.calculateProductDiscount(activePromotion, product.price);
        
        return {
          ...product.toObject(),
          isPreorder: true, // Marcar como preorder cuando tiene promoción
          originalPrice: product.price,
          discountAmount: discount.discountAmount,
          finalPrice: discount.finalPrice,
          hasPromotion: true,
          promotionName: activePromotion.name,
        };
      }
    } catch (error) {
      this.logger.warn(`Error obteniendo promociones para producto ${productId}:`, error.message);
    }

    return {
      ...product.toObject(),
      originalPrice: product.price,
      discountAmount: 0,
      finalPrice: product.price,
      hasPromotion: false,
    };
  }

  async findAllWithPromotions(query: any): Promise<{ 
    products: Array<Product & { 
      originalPrice: number; 
      discountAmount: number; 
      finalPrice: number; 
      hasPromotion: boolean; 
      promotionName?: string;
    }>; 
    total: number; 
    page: number; 
    totalPages: number;
  }> {
    const result = await this.findAll(query);
    
    const productsWithPromotions = await Promise.all(
      result.products.map(async (product) => {
        try {
          const promotions = await this.promotionsService.getPromotionsByProduct((product._id as any).toString());
          const activePromotion = promotions.find(p => p.isActive);
          
          if (activePromotion) {
            const discount = this.calculateProductDiscount(activePromotion, product.price);
            
            return {
              ...product.toObject(),
              isPreorder: true, // Marcar como preorder cuando tiene promoción
              originalPrice: product.price,
              discountAmount: discount.discountAmount,
              finalPrice: discount.finalPrice,
              hasPromotion: true,
              promotionName: activePromotion.name,
            };
          }
        } catch (error) {
          this.logger.warn(`Error obteniendo promociones para producto ${(product._id as any).toString()}:`, error.message);
        }

        return {
          ...product.toObject(),
          originalPrice: product.price,
          discountAmount: 0,
          finalPrice: product.price,
          hasPromotion: false,
        };
      })
    );

    return {
      ...result,
      products: productsWithPromotions,
    };
  }

  private calculateProductDiscount(promotion: any, originalPrice: number): {
    discountAmount: number;
    finalPrice: number;
  } {
    let discountAmount = 0;

    switch (promotion.type) {
      case 'percentage':
        discountAmount = (originalPrice * promotion.discountPercentage) / 100;
        break;
      case 'fixed_amount':
        discountAmount = Math.min(promotion.discountAmount, originalPrice);
        break;
      default:
        discountAmount = 0;
    }

    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return {
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
    };
  }

}
