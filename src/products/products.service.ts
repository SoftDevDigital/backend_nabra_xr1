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
    
    // Asegurar que page sea al menos 1
    const validPage = Math.max(1, Number(page) || 1);
    const validLimit = Math.max(1, Number(limit) || 12);
    
    const skip = (validPage - 1) * validLimit;
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
        .limit(validLimit)
        .exec(),
      this.productModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / validLimit);

    return {
      products,
      total,
      page: validPage,
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
    rawBody?: any,
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

    console.log('📦 Creating product with sizes:', sizes);
    console.log('📦 stockBySize:', createProductDto.stockBySize);
    console.log('📦 stockBySizes:', createProductDto.stockBySizes);
    
    // Log rawBody para debug
    if (rawBody) {
      console.log('📦 Raw body keys:', Object.keys(rawBody));
      console.log('📦 Raw body:', JSON.stringify(rawBody, null, 2));
    }
    
    // Log createProductDto para debug
    console.log('📦 createProductDto keys:', Object.keys(createProductDto));
    console.log('📦 createProductDto:', JSON.stringify(createProductDto, null, 2));

    // Crear stockBySize a partir de los talles y stock individual por talle
    let stockBySize: { [size: string]: number } = {};
    
    // PRIMERO: buscar campos anidados en form-data (stockBySize[35], stockBySize[36], etc.)
    if (rawBody) {
      console.log('🔍 Searching for nested stockBySize fields in rawBody');
      const nestedStock: { [size: string]: number } = {};
      
      for (const key in rawBody) {
        console.log(`   - Checking key: "${key}"`);
        if (key.startsWith('stockBySize[') && key.endsWith(']')) {
          const size = key.slice(12, -1); // Extraer el tamaño entre corchetes
          const stockValue = rawBody[key];
          console.log(`   ✅ Found: stockBySize[${size}] = ${stockValue}`);
          const stock = parseInt(stockValue);
          if (!isNaN(stock)) {
            nestedStock[size] = stock;
          }
        }
      }
      
      if (Object.keys(nestedStock).length > 0) {
        console.log('✅ Built stockBySize from nested fields:', nestedStock);
        stockBySize = nestedStock;
      }
    }
    
    // PRIMERO.5: buscar campos anidados también en createProductDto (por si NestJS los procesa)
    if (!stockBySize || Object.keys(stockBySize).length === 0) {
      console.log('🔍 Searching for nested stockBySize fields in createProductDto');
      const nestedStock: { [size: string]: number } = {};
      
      for (const key in createProductDto) {
        console.log(`   - Checking key: "${key}"`);
        if (key.startsWith('stockBySize[') && key.endsWith(']')) {
          const size = key.slice(12, -1); // Extraer el tamaño entre corchetes
          const stockValue = createProductDto[key];
          console.log(`   ✅ Found: stockBySize[${size}] = ${stockValue}`);
          const stock = parseInt(stockValue);
          if (!isNaN(stock)) {
            nestedStock[size] = stock;
          }
        }
      }
      
      if (Object.keys(nestedStock).length > 0) {
        console.log('✅ Built stockBySize from createProductDto nested fields:', nestedStock);
        stockBySize = nestedStock;
      }
    }
    
    // PRIMERO.6: buscar campos con formato diferente (por si multer los procesa de otra manera)
    if (!stockBySize || Object.keys(stockBySize).length === 0) {
      console.log('🔍 Searching for alternative stockBySize field formats');
      
      // Buscar campos que contengan "stockBySize" en el nombre
      for (const key in createProductDto) {
        if (key.includes('stockBySize') && key !== 'stockBySize' && key !== 'stockBySizes') {
          console.log(`   - Found alternative field: "${key}" = ${createProductDto[key]}`);
          
          // Intentar extraer el tamaño del nombre del campo
          const match = key.match(/stockBySize\[?([^\]]+)\]?/);
          if (match) {
            const size = match[1];
            const stockValue = createProductDto[key];
            const stock = parseInt(stockValue);
            if (!isNaN(stock)) {
              stockBySize[size] = stock;
              console.log(`   ✅ Added: ${size} = ${stock}`);
            }
          }
        }
      }
      
      if (Object.keys(stockBySize).length > 0) {
        console.log('✅ Built stockBySize from alternative formats:', stockBySize);
      }
    }
    
    // PRIMERO.7: Si aún no tenemos stockBySize, intentar construir desde los talles con valores por defecto
    if (!stockBySize || Object.keys(stockBySize).length === 0) {
      console.log('🔍 No stockBySize found, checking if we can infer from sizes');
      
      // Si tenemos talles pero no stock, usar 0 por defecto
      if (sizes && sizes.length > 0) {
        console.log('⚠️ WARNING: No stock data provided. Defaulting all sizes to 0');
        sizes.forEach(size => {
          stockBySize[size] = 0;
        });
      }
    }
    
    // SEGUNDO: intentar con stockBySize directamente (si viene como objeto válido)
    if (!stockBySize || Object.keys(stockBySize).length === 0) {
      if (createProductDto.stockBySize && typeof createProductDto.stockBySize === 'object' && !Array.isArray(createProductDto.stockBySize)) {
        console.log('✅ Using stockBySize object:', createProductDto.stockBySize);
        stockBySize = createProductDto.stockBySize;
      }
    }
    
    // TERCERO: Si viene stockBySizes string en formato "35:10,36:20,37:15"
    if (!stockBySize || Object.keys(stockBySize).length === 0) {
      if (createProductDto.stockBySizes) {
        console.log('✅ Using stockBySizes string:', createProductDto.stockBySizes);
        const stockEntries = createProductDto.stockBySizes.split(',');
        stockEntries.forEach(entry => {
          const [size, stock] = entry.trim().split(':');
          if (size && stock) {
            stockBySize[size.trim()] = parseInt(stock.trim());
          }
        });
      }
    }
    
    console.log('📦 Final stockBySize:', stockBySize);

    const productData = {
      name: createProductDto.name,
      description: createProductDto.description,
      price: createProductDto.price, // Ya viene convertido a number desde el DTO
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

  async findByIdWithPromotions(productId: string, quantity: number = 1): Promise<Product & { 
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
        const discount = this.calculateProductDiscount(activePromotion, product.price, quantity);
        
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
            // Usar cantidad 1 por defecto para el catálogo (se ajustará en carrito)
            const discount = this.calculateProductDiscount(activePromotion, product.price, 1);
            
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

  private calculateProductDiscount(promotion: any, originalPrice: number, quantity: number = 1): {
    discountAmount: number;
    finalPrice: number;
  } {
    let discountAmount = 0;

    // ✅ VALIDACIONES DE SEGURIDAD
    if (quantity <= 0 || originalPrice <= 0) {
      return {
        discountAmount: 0,
        finalPrice: Math.max(0, originalPrice),
      };
    }

    switch (promotion.type) {
      case 'percentage':
        // ✅ DESCUENTO PORCENTUAL - Se aplica al total de la cantidad
        // Para 10 zapatillas de $100 con 20%: (100 * 10 * 20) / 100 = $200
        discountAmount = (originalPrice * quantity * promotion.discountPercentage) / 100;
        break;
      case 'fixed_amount':
        // ✅ DESCUENTO FIJO - Se aplica al total del carrito, no por producto
        // En este contexto (por producto), no aplicamos descuento fijo
        // El descuento fijo se maneja en el servicio de carrito
        discountAmount = 0;
        break;
      case 'buy_x_get_y':
        // ✅ LÓGICA CORRECTA PARA NxY
        // N = buyQuantity (total que lleva)
        // Y = getQuantity (lo que paga)
        // Para 2x1: lleva 2, paga 1 (1 gratis)
        // Para 3x1: lleva 3, paga 1 (2 gratis)
        // Para 3x2: lleva 3, paga 2 (1 gratis)
        if (promotion.buyQuantity && promotion.getQuantity && quantity >= promotion.buyQuantity) {
          // Calcular cuántos sets completos puede obtener
          // Un set = N productos totales (Y que paga + (N-Y) gratis)
          const itemsPerSet = promotion.buyQuantity; // Total que lleva por set
          const setsAvailable = Math.floor(quantity / itemsPerSet);
          
          if (setsAvailable > 0) {
            // Calcular cuántos productos gratis obtiene por set
            const freeItemsPerSet = promotion.buyQuantity - promotion.getQuantity; // N - Y = gratis por set
            const totalFreeItems = setsAvailable * freeItemsPerSet;
            // Los productos gratis no se cobran
            discountAmount = totalFreeItems * originalPrice;
          }
        }
        break;
      case 'free_shipping':
        // ✅ ENVÍO GRATIS - No afecta el precio del producto
        // El descuento de envío se maneja en el servicio de shipping
        // Aquí solo marcamos que tiene promoción de envío gratis
        discountAmount = 0; // No descuenta del producto
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
