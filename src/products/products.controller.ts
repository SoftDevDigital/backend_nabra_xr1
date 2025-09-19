import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Product } from './schemas/product.schema';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Public()
  @Get('search')
  async search(@Query('q') query: string): Promise<Product[]> {
    return this.productsService.search(query);
  }

  @Public()
  @Get('preorders')
  async findPreorders(): Promise<Product[]> {
    return this.productsService.findPreorders();
  }

  @Public()
  @Get('featured')
  async findFeatured(): Promise<Product[]> {
    return this.productsService.findFeatured();
  }

  @Public()
  @Get()
  async findAll(@Query() query: any): Promise<Product[]> {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string): Promise<Product> {
    return this.productsService.findById(id);
  }

  @Roles('admin')
  @Post()
  async create(
    @Body() createProductDto: CreateProductDto,
    @Request() req,
  ): Promise<Product> {
    return this.productsService.create(createProductDto, req.user);
  }

  @Roles('admin')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ): Promise<Product> {
    return this.productsService.update(id, updateProductDto, req.user);
  }

  @Roles('admin')
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    return this.productsService.delete(id, req.user);
  }

  @Roles('admin')
  @Post(':id/images')
  async addImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
    @Request() req,
  ): Promise<Product> {
    return this.productsService.addImage(id, imageUrl, req.user);
  }
}
