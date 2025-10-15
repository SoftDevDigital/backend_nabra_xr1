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

  @ApiOperation({ summary: 'Subir imagen desde archivo', description: 'Recibe una imagen como archivo y la convierte a URL guardándola en la base de datos.' })
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
  @Post('upload/file')
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
        if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten archivos JPEG y PNG'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Request() req,
  ): Promise<Media> {
    const uploadDto: UploadDto = { type, url: '' }; // url no se usa en uploadFile
    return this.mediaService.uploadFile(file, uploadDto, req.user);
  }

  @ApiOperation({ summary: 'Registrar imagen por URL', description: 'Recibe una URL de imagen y la registra en media.' })
  @ApiBody({ schema: { type: 'object', properties: { url: { type: 'string', example: 'https://cdn.example.com/image.jpg' }, type: { type: 'string', enum: ['product', 'cover'] } } } })
  @Roles('admin')
  @Post('upload/url')
  async uploadByUrl(
    @Body() uploadDto: UploadDto,
    @Request() req,
  ): Promise<Media> {
    return this.mediaService.uploadByUrl(uploadDto, req.user);
  }

  @ApiOperation({ summary: 'Obtener media', description: 'Obtiene los metadatos de un archivo multimedia por ID.' })
  @Public()
  @ApiParam({ name: 'id', description: 'ID de media' })
  @Get(':id')
  async getFile(@Param('id') id: string): Promise<Media> {
    return this.mediaService.getFile(id);
  }

  @ApiOperation({ summary: 'Obtener URL de imagen', description: 'Obtiene la URL completa de una imagen para renderizar en el frontend.' })
  @Public()
  @ApiParam({ name: 'id', description: 'ID de media' })
  @Get(':id/url')
  async getFileUrl(@Param('id') id: string) {
    return this.mediaService.getFileUrl(id);
  }

  @ApiOperation({ summary: 'Eliminar media', description: 'Elimina un archivo multimedia por ID.' })
  @ApiParam({ name: 'id', description: 'ID de media' })
  @Roles('admin')
  @Delete(':id')
  async deleteFile(@Param('id') id: string, @Request() req): Promise<void> {
    return this.mediaService.deleteFile(id, req.user);
  }

  @ApiOperation({ summary: 'Marcar como portada', description: 'Marca una imagen como portada de un recurso.' })
  @ApiParam({ name: 'id', description: 'ID de media' })
  @Roles('admin')
  @Post('cover-image/:id')
  async setCoverImage(@Param('id') id: string, @Request() req): Promise<Media> {
    return this.mediaService.setCoverImage(id, req.user);
  }

  @ApiOperation({ summary: 'Desactivar portada', description: 'Desactiva la imagen como portada.' })
  @ApiParam({ name: 'id', description: 'ID de media' })
  @Roles('admin')
  @Post('cover-image/:id/deactivate')
  async deactivateCoverImage(
    @Param('id') id: string,
    @Request() req,
  ): Promise<Media> {
    return this.mediaService.deactivateCoverImage(id, req.user);
  }

  @ApiOperation({ summary: 'Portada activa (URL)', description: 'Devuelve la URL de la imagen de portada activa.' })
  @Public()
  @Get('cover-image/active/url')
  async getActiveCoverUrl() {
    return this.mediaService.getActiveCoverUrl();
  }
}
