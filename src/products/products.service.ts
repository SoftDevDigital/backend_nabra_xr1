import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async findAll(query: any): Promise<Product[]> {
    const { page = 1, limit = 10, category, minPrice, maxPrice } = query;
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (category) filter.category = category;
    if (minPrice) filter.price = { $gte: minPrice };
    if (maxPrice) filter.price = { ...filter.price, $lte: maxPrice };

    return this.productModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
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

  async reserveStock(productId: string, quantity: number): Promise<void> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (!product.isPreorder && product.stock < quantity) {
      throw new BadRequestException(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Required: ${quantity}`);
    }

    if (!product.isPreorder) {
      product.stock -= quantity;
      await product.save();
    }
  }

  async releaseStock(productId: string, quantity: number): Promise<void> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (!product.isPreorder) {
      product.stock += quantity;
      await product.save();
    }
  }

  async bulkReserveStock(items: { productId: string; quantity: number }[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    const reservations: { productId: string; quantity: number }[] = [];

    // Primero validamos todo el stock
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

    // Si hay errores, no reservamos nada
    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Reservamos todo el stock si no hay errores
    try {
      for (const reservation of reservations) {
        await this.reserveStock(reservation.productId, reservation.quantity);
      }
      return { success: true, errors: [] };
    } catch (error) {
      // Si algo falla, liberamos lo que ya se reservó
      for (const reservation of reservations) {
        try {
          await this.releaseStock(reservation.productId, reservation.quantity);
        } catch (releaseError) {
          console.error('Error releasing stock:', releaseError);
        }
      }
      return { success: false, errors: [`Stock reservation failed: ${error.message}`] };
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
}
