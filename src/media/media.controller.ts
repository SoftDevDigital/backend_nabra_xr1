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

  @ApiOperation({ summary: 'Registrar imagen por URL', description: 'Recibe una URL de imagen y la registra en media.' })
  @ApiBody({ schema: { type: 'object', properties: { url: { type: 'string', example: 'https://cdn.example.com/image.jpg' }, type: { type: 'string', enum: ['product', 'cover'] } } } })
  @Roles('admin')
  @Post('upload')
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
