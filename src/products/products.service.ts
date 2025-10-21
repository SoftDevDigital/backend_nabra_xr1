import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { SimplePromotionsService } from '../promotions/simple-promotions.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @Inject(forwardRef(() => SimplePromotionsService)) 
    private promotionsService: SimplePromotionsService,
    private mediaService: MediaService,
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

  async createWithImages(
    createProductDto: any,
    images: Express.Multer.File[],
    user: any,
  ): Promise<Product> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can create products');
    }

    // Procesar las imágenes
    const imageUrls: string[] = [];
    
    if (images && images.length > 0) {
      for (const image of images) {
        // Subir cada imagen al sistema de media
        const media = await this.mediaService.uploadFile(image, { type: 'product' }, user);
        imageUrls.push(media.url);
      }
    }

    // Preparar datos del producto (sizes ya viene como array desde el DTO)
    const sizes = createProductDto.sizes || [];

    // Crear stockBySize a partir de los talles y stock individual por talle
    let stockBySize: { [size: string]: number } = {};
    if (createProductDto.stockBySize) {
      // Si viene stockBySize directamente (objeto)
      stockBySize = createProductDto.stockBySize;
    } else {
      // Si viene stock individual por talle en el formato: "35:10,36:20,37:15"
      if (createProductDto.stockBySizes) {
        const stockEntries = createProductDto.stockBySizes.split(',');
        stockEntries.forEach(entry => {
          const [size, stock] = entry.trim().split(':');
          if (size && stock) {
            stockBySize[size.trim()] = parseInt(stock.trim());
          }
        });
      } else {
        // Fallback: distribuir stock general entre talles (solo para compatibilidad)
        const stockPerSize = createProductDto.stock ? Math.floor(parseInt(createProductDto.stock) / sizes.length) : 0;
        sizes.forEach(size => {
          stockBySize[size] = stockPerSize;
        });
      }
    }

    const productData = {
      name: createProductDto.name,
      description: createProductDto.description,
      price: parseFloat(createProductDto.price),
      category: createProductDto.category,
      sizes,
      stockBySize,
      images: imageUrls,
      isPreorder: createProductDto.isPreorder || false,
      isFeatured: createProductDto.isFeatured || false,
    };

    const product = new this.productModel(productData);
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
  
  async checkStockAvailability(productId: string, requiredQuantity: number, size?: string): Promise<{ available: boolean; currentStock: number; message?: string }> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (product.isPreorder) {
      return {
        available: true,
        currentStock: 999, // Valor simbólico para preventa
        message: 'Preorder item - stock validation bypassed'
      };
    }

    // Si no hay stockBySize configurado, permitir la compra (compatibilidad con productos antiguos)
    if (!product.stockBySize || Object.keys(product.stockBySize).length === 0) {
      return {
        available: true,
        currentStock: 999, // Valor simbólico para productos sin stock configurado
        message: 'Stock not configured - allowing purchase'
      };
    }

    if (!size) {
      // Si no se especifica talle, verificar stock total
      const totalStock = Object.values(product.stockBySize || {}).reduce((sum, stock) => sum + stock, 0);
      const available = totalStock >= requiredQuantity;
      return {
        available,
        currentStock: totalStock,
        message: available ? undefined : `Insufficient total stock. Available: ${totalStock}, Required: ${requiredQuantity}`
      };
    }

    // Verificar stock por talle específico
    const stockForSize = product.stockBySize?.[size] || 0;
    const available = stockForSize >= requiredQuantity;
    return {
      available,
      currentStock: stockForSize,
      message: available ? undefined : `Insufficient stock for size ${size}. Available: ${stockForSize}, Required: ${requiredQuantity}`
    };
  }

  async reserveStock(productId: string, quantity: number, size?: string): Promise<void> {
    // Usar findOneAndUpdate para operación atómica
    if (size) {
      // Reservar stock por talle específico
      const result = await this.productModel.findOneAndUpdate(
        { 
          _id: productId,
          [`stockBySize.${size}`]: { $gte: quantity }
        },
        { 
          $inc: { [`stockBySize.${size}`]: -quantity }
        },
        { new: true }
      );
      
      if (!result) {
        const product = await this.productModel.findById(productId);
        const stockForSize = product?.stockBySize?.[size] || 0;
        throw new BadRequestException(`Insufficient stock for size ${size}. Available: ${stockForSize}, Required: ${quantity}`);
      }
    } else {
      // Para reserva sin talle específico, validar stock total primero
      const product = await this.productModel.findById(productId);
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }
      
      if (product.isPreorder) {
        return; // No reservar stock para preventas
      }
      
      const totalStock = Object.values(product.stockBySize || {}).reduce((sum, stock) => sum + stock, 0);
      if (totalStock < quantity) {
        throw new BadRequestException(`Insufficient total stock. Available: ${totalStock}, Required: ${quantity}`);
      }
      
      // Distribuir la cantidad entre los talles disponibles
      let remainingQuantity = quantity;
      for (const [sizeKey, stock] of Object.entries(product.stockBySize || {})) {
        if (remainingQuantity <= 0) break;
        const toReserve = Math.min(stock, remainingQuantity);
        
        await this.productModel.findOneAndUpdate(
          { _id: productId },
          { $inc: { [`stockBySize.${sizeKey}`]: -toReserve } }
        );
        
        remainingQuantity -= toReserve;
      }
    }
  }

  async releaseStock(productId: string, quantity: number, size?: string): Promise<void> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (!product.isPreorder) {
      if (size) {
        // Liberar stock por talle específico usando operación atómica
        await this.productModel.findOneAndUpdate(
          { _id: productId },
          { $inc: { [`stockBySize.${size}`]: quantity } }
        );
      } else {
        // Liberar stock total (agregar al primer talle disponible)
        const firstSize = Object.keys(product.stockBySize || {})[0];
        if (firstSize) {
          await this.productModel.findOneAndUpdate(
            { _id: productId },
            { $inc: { [`stockBySize.${firstSize}`]: quantity } }
          );
        }
      }
    }
  }

  async bulkReserveStock(items: { productId: string; quantity: number; size?: string }[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    const successfulReservations: { productId: string; quantity: number; size?: string }[] = [];

    // Intentar reservar cada item individualmente con validación atómica
    for (const item of items) {
      try {
        // Usar reserveStock que ya tiene validación atómica
        await this.reserveStock(item.productId, item.quantity, item.size);
        successfulReservations.push(item);
        this.logger.log(`✅ Stock reserved: ${item.productId} - Size: ${item.size} - Quantity: ${item.quantity}`);
      } catch (error) {
        // Si falla una reserva, liberar las reservas exitosas anteriores
        this.logger.error(`❌ Failed to reserve stock for ${item.productId}:`, error);
        
        // Liberar stock de reservas exitosas anteriores
        for (const successful of successfulReservations) {
          try {
            await this.releaseStock(successful.productId, successful.quantity, successful.size);
            this.logger.log(`🔄 Released stock due to failure: ${successful.productId} - Size: ${successful.size} - Quantity: ${successful.quantity}`);
          } catch (releaseError) {
            this.logger.error(`❌ Failed to release stock for ${successful.productId}:`, releaseError);
          }
        }
        
        errors.push(`${error.message}`);
        return { success: false, errors };
      }
    }

    this.logger.log(`✅ Bulk stock reservation completed successfully for ${successfulReservations.length} items`);
    return { success: true, errors: [] };
  }

  async getStockStatus(productId: string): Promise<{ 
    stockBySize: { [size: string]: number }; 
    totalStock: number;
    isPreorder: boolean; 
    isAvailable: boolean;
    availableSizes: string[];
  }> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const stockBySize = product.stockBySize || {};
    const totalStock = Object.values(stockBySize).reduce((sum, stock) => sum + stock, 0);
    const availableSizes = Object.entries(stockBySize)
      .filter(([_, stock]) => stock > 0)
      .map(([size, _]) => size);

    return {
      stockBySize,
      totalStock,
      isPreorder: product.isPreorder,
      isAvailable: product.isPreorder || totalStock > 0,
      availableSizes
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
