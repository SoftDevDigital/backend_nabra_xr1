import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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
}
