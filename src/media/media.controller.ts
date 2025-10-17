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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MediaService } from './media.service';
import { UploadDto } from './dtos/upload.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Media } from './schemas/media.schema';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Media')
@ApiBearerAuth('bearer')
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @ApiOperation({ summary: 'Subir imagen', description: 'Recibe una imagen como archivo y la guarda en el servidor. Límite máximo: 25MB.' })
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
        fileSize: 25 * 1024 * 1024, // 25MB
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

  @ApiOperation({ summary: 'Marcar como portada', description: 'Marca una imagen como portada.' })
  @ApiParam({ name: 'id', description: 'ID de imagen' })
  @Roles('admin')
  @Post(':id/set-cover')
  async setCoverImage(@Param('id') id: string, @Request() req): Promise<Media> {
    return this.mediaService.setCoverImage(id, req.user);
  }

  @ApiOperation({ summary: 'Ver portada activa', description: 'Obtiene la portada activa.' })
  @Public()
  @Get('cover/active')
  async getActiveCover() {
    return this.mediaService.getActiveCoverUrl();
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
