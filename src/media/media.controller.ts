import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MediaService } from './media.service';
import { UploadDto } from './dtos/upload.dto';
import { SetCoverDto } from './dtos/set-cover.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Media } from './schemas/media.schema';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Media')
@ApiBearerAuth('bearer')
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @ApiOperation({ summary: 'Subir imagen', description: 'Recibe una imagen como archivo y la guarda en el servidor. Límite máximo: 150MB.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        file: { type: 'string', format: 'binary', description: 'Archivo de imagen (PNG/JPG)' },
        type: { type: 'string', enum: ['product', 'cover'], description: 'Tipo de imagen' }
      },
      required: ['file', 'type']
    } 
  })
  @Roles('admin')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
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
        console.log('File received:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        });
        
        if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten JPEG y PNG.`), false);
        }
      },
      limits: {
        fileSize: 150 * 1024 * 1024, // 150MB
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Request() req,
  ): Promise<Media> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    
    console.log('Uploading file:', {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      type: type
    });
    
    const uploadDto: UploadDto = { type };
    return this.mediaService.uploadFile(file, uploadDto, req.user);
  }


  @ApiOperation({ summary: 'Ver imagen', description: 'Obtiene información de una imagen por ID.' })
  @Public()
  @ApiParam({ name: 'id', description: 'ID de imagen' })
  @Get(':id')
  async getImage(@Param('id') id: string): Promise<Media> {
    return this.mediaService.getFile(id);
  }

  @ApiOperation({ summary: 'Eliminar imagen', description: 'Elimina una imagen por ID.' })
  @ApiParam({ name: 'id', description: 'ID de imagen' })
  @Roles('admin')
  @Delete(':id')
  async deleteImage(@Param('id') id: string, @Request() req): Promise<void> {
    return this.mediaService.deleteFile(id, req.user);
  }

  @ApiOperation({ summary: 'Listar imágenes', description: 'Lista todas las imágenes.' })
  @Roles('admin')
  @Get()
  async listImages() {
    return this.mediaService.listImages({});
  }

  @ApiOperation({ summary: 'Marcar como portada', description: 'Marca una imagen existente como portada.' })
  @ApiParam({ name: 'id', description: 'ID de imagen' })
  @Roles('admin')
  @Post(':id/set-cover')
  async setCoverImage(@Param('id') id: string, @Request() req): Promise<Media> {
    return this.mediaService.setCoverImage(id, req.user);
  }

  @ApiOperation({ 
    summary: 'Configurar imagen de portada', 
    description: 'Configura una imagen de portada subiendo un archivo o proporcionando una URL. Solo se requiere uno de los dos.' 
  })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        url: { 
          type: 'string', 
          format: 'uri', 
          description: 'URL de la imagen de portada (opcional si se proporciona archivo)',
          example: 'https://example.com/cover-image.jpg'
        },
        file: { 
          type: 'string', 
          format: 'binary', 
          description: 'Archivo de imagen de portada (opcional si se proporciona URL)'
        }
      }
    } 
  })
  @ApiConsumes('multipart/form-data')
  @Roles('admin')
  @Post('set-cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `cover_${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten JPEG, PNG, GIF y WebP.`), false);
        }
      },
      limits: {
        fileSize: 150 * 1024 * 1024, // 150MB
      },
    }),
  )
  async setCover(
    @Body() setCoverDto: SetCoverDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ): Promise<Media> {
    // Validar que se proporcione al menos uno de los dos
    if (!setCoverDto.url && !file) {
      throw new BadRequestException('Debe proporcionar una URL o subir un archivo');
    }

    // Si se proporciona URL, usar el método de URL
    if (setCoverDto.url) {
      return this.mediaService.setCoverImageFromUrl(setCoverDto.url, req.user);
    }

    // Si se proporciona archivo, subirlo primero y luego configurarlo como portada
    if (file) {
      const uploadedMedia = await this.mediaService.uploadFile(file, { type: 'cover' }, req.user);
      return this.mediaService.setCoverImage((uploadedMedia as any)._id.toString(), req.user);
    }

    // Este punto nunca se debería alcanzar debido a la validación anterior
    throw new BadRequestException('Error inesperado al procesar la imagen de portada');
  }

  @ApiOperation({ summary: 'Ver portada activa', description: 'Obtiene la portada activa.' })
  @Public()
  @Get('cover/active')
  async getActiveCover(@Res() res) {
    const result = await this.mediaService.getActiveCoverUrl();
    
    // 🚀 FIX: Agregar headers para evitar caché agresivo
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${Date.now()}"`
    });
    
    return res.json(result);
  }

  @ApiOperation({ summary: 'Galería de productos', description: 'Lista todas las imágenes de productos disponibles.' })
  @Roles('admin')
  @Get('gallery/products')
  async getProductGallery() {
    return this.mediaService.listImages({ type: 'product' });
  }

  @ApiOperation({ summary: 'Galería de portadas', description: 'Lista todas las imágenes de portadas disponibles.' })
  @Roles('admin')
  @Get('gallery/covers')
  async getCoverGallery() {
    return this.mediaService.listImages({ type: 'cover' });
  }
}
