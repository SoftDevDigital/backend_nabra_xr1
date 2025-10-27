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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { CreateProductMultipartDto } from './dtos/create-product-multipart.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { CategoryResponseDto, CategoryProductsResponseDto, CategoryStatsResponseDto } from './dtos/category-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Product } from './schemas/product.schema';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MediaService } from '../media/media.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private mediaService: MediaService
  ) {}

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
  @ApiOperation({ summary: 'Crear producto con imágenes', description: 'Crea un nuevo producto con imágenes. Requiere rol admin.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        name: { type: 'string', description: 'Nombre del producto' },
        description: { type: 'string', description: 'Descripción del producto' },
        price: { type: 'string', description: 'Precio del producto (form-data)' },
        category: { type: 'string', description: 'Categoría del producto' },
        sizes: { type: 'string', description: 'Tallas separadas por coma (ej: "35,36,37")' },
        stockBySizes: { type: 'string', description: 'Stock por talle separado por coma (ej: "35:10,36:20,37:15") - Formato alternativo 1' },
        stockBySize: { type: 'object', description: 'Objeto con stock por talle (ej: {"35": 10, "36": 20}) - Formato alternativo 2' },
        'stockBySize[size]': { type: 'string', description: 'Campos individuales para cada talle (ej: stockBySize[35]=10, stockBySize[36]=20) - Formato alternativo 3 - REQUERIDO si no se usa stockBySizes' },
        isPreorder: { type: 'string', description: 'Es preventa (opcional, "true" o "false")' },
        isFeatured: { type: 'string', description: 'Es destacado (opcional, "true" o "false")' },
        images: { type: 'array', items: { type: 'string', format: 'binary' }, description: 'Imágenes del producto' }
      },
      required: ['name', 'description', 'price', 'category', 'sizes']
    } 
  })
  @ApiResponse({ status: 201, description: 'Producto creado con imágenes. Límite máximo por imagen: 150MB.' })
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten archivos JPEG y PNG'), false);
        }
      },
      limits: {
        fileSize: 150 * 1024 * 1024, // 150MB por imagen
      },
    }),
  )
  async create(
    @Body() createProductDto: CreateProductMultipartDto,
    @UploadedFiles() images: Express.Multer.File[],
    @Request() req,
  ): Promise<Product> {
    // Pasar el rawBody (form-data sin procesar) para detectar campos anidados
    return this.productsService.createWithImages(createProductDto, images, req.user, req.body);
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
