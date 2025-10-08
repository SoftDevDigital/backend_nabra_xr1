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
import { CategoryResponseDto, CategoryProductsResponseDto, CategoryStatsResponseDto } from './dtos/category-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Product } from './schemas/product.schema';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Public()
  @ApiOperation({ summary: 'Buscar productos', description: 'Busca productos por texto libre en nombre, descripción o categorías.' })
  @ApiQuery({ name: 'q', required: true, description: 'Texto de búsqueda' })
  @ApiResponse({ status: 200, description: 'Lista de productos encontrados' })
  @Get('search')
  async search(@Query('q') query: string): Promise<Product[]> {
    return this.productsService.search(query);
  }

  @Public()
  @ApiOperation({ summary: 'Listar preventas', description: 'Obtiene la lista de productos en preventa.' })
  @Get('preorders')
  async findPreorders(): Promise<Product[]> {
    return this.productsService.findPreorders();
  }

  @Public()
  @ApiOperation({ summary: 'Listar destacados', description: 'Obtiene la lista de productos destacados.' })
  @Get('featured')
  async findFeatured(): Promise<Product[]> {
    return this.productsService.findFeatured();
  }

  @Public()
  @ApiOperation({ summary: 'Listar categorías', description: 'Devuelve todas las categorías con metadatos.' })
  @Get('categories')
  async findAllCategories(): Promise<CategoryResponseDto[]> {
    return this.productsService.findAllCategories();
  }

  @Public()
  @ApiOperation({ summary: 'Estadísticas de categoría', description: 'Devuelve KPIs de una categoría específica.' })
  @ApiParam({ name: 'category', description: 'Slug de la categoría' })
  @Get('categories/:category/stats')
  async getCategoryStats(@Param('category') category: string): Promise<CategoryStatsResponseDto> {
    return this.productsService.getCategoryStats(category);
  }

  @Public()
  @ApiOperation({ summary: 'Listar productos', description: 'Listado paginado y filtrado de productos con información de promociones.' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, description: 'Tamaño de página' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista paginada de productos con promociones',
    schema: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' },
              originalPrice: { type: 'number' },
              discountAmount: { type: 'number' },
              finalPrice: { type: 'number' },
              hasPromotion: { type: 'boolean' },
              promotionName: { type: 'string' }
            }
          }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' }
      }
    }
  })
  @Get()
  async findAll(@Query() query: any): Promise<CategoryProductsResponseDto> {
    return this.productsService.findAllWithPromotions(query);
  }

  @Public()
  @ApiOperation({ summary: 'Obtener producto por ID', description: 'Retorna el detalle de un producto con información de promociones.' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ 
    status: 200, 
    description: 'Producto con información de promociones',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        price: { type: 'number' },
        originalPrice: { type: 'number' },
        discountAmount: { type: 'number' },
        finalPrice: { type: 'number' },
        hasPromotion: { type: 'boolean' },
        promotionName: { type: 'string' }
      }
    }
  })
  @Get(':id')
  async findById(@Param('id') id: string): Promise<Product> {
    return this.productsService.findByIdWithPromotions(id);
  }

  @Roles('admin')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Crear producto', description: 'Crea un nuevo producto. Requiere rol admin.' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Producto creado' })
  @Post()
  async create(
    @Body() createProductDto: CreateProductDto,
    @Request() req,
  ): Promise<Product> {
    return this.productsService.create(createProductDto, req.user);
  }

  @Roles('admin')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Actualizar producto', description: 'Actualiza los datos de un producto existente.' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiBody({ type: UpdateProductDto })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ): Promise<Product> {
    return this.productsService.update(id, updateProductDto, req.user);
  }

  @Roles('admin')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Eliminar producto', description: 'Elimina un producto por ID.' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    return this.productsService.delete(id, req.user);
  }

  @Roles('admin')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Agregar imagen a producto', description: 'Agrega una imagen al producto indicado.' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiBody({ schema: { properties: { imageUrl: { type: 'string', example: 'https://cdn.example.com/image.jpg' } } } })
  @Post(':id/images')
  async addImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
    @Request() req,
  ): Promise<Product> {
    return this.productsService.addImage(id, imageUrl, req.user);
  }

  // ===== ENDPOINTS CON PROMOCIONES =====

  @Public()
  @ApiOperation({ summary: 'Obtener producto con promociones', description: 'Obtiene un producto con información de promociones aplicadas' })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({ 
    status: 200, 
    description: 'Producto con información de promociones',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        price: { type: 'number' },
        originalPrice: { type: 'number' },
        discountAmount: { type: 'number' },
        finalPrice: { type: 'number' },
        hasPromotion: { type: 'boolean' },
        promotionName: { type: 'string' }
      }
    }
  })
  @Get(':id/promotions')
  async getProductWithPromotions(@Param('id') id: string) {
    return this.productsService.findByIdWithPromotions(id);
  }

  @Public()
  @ApiOperation({ summary: 'Listar productos con promociones', description: 'Lista productos con información de promociones aplicadas' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, description: 'Productos por página' })
  @ApiQuery({ name: 'category', required: false, description: 'Filtrar por categoría' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por texto' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de productos con promociones',
    schema: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' },
              originalPrice: { type: 'number' },
              discountAmount: { type: 'number' },
              finalPrice: { type: 'number' },
              hasPromotion: { type: 'boolean' },
              promotionName: { type: 'string' }
            }
          }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' }
      }
    }
  })
  @Get('with-promotions')
  async getProductsWithPromotions(@Query() query: any) {
    return this.productsService.findAllWithPromotions(query);
  }
}
