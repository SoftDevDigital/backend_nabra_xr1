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

@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

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
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new Error('Only JPEG/PNG images are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadDto,
    @Request() req,
  ): Promise<Media> {
    return this.mediaService.uploadFile(file, uploadDto, req.user);
  }

  @Public()
  @Get(':id')
  async getFile(@Param('id') id: string): Promise<Media> {
    return this.mediaService.getFile(id);
  }

  @Roles('admin')
  @Delete(':id')
  async deleteFile(@Param('id') id: string, @Request() req): Promise<void> {
    return this.mediaService.deleteFile(id, req.user);
  }

  @Roles('admin')
  @Post('cover-image/:id')
  async setCoverImage(@Param('id') id: string, @Request() req): Promise<Media> {
    return this.mediaService.setCoverImage(id, req.user);
  }

  @Roles('admin')
  @Post('cover-image/:id/deactivate')
  async deactivateCoverImage(
    @Param('id') id: string,
    @Request() req,
  ): Promise<Media> {
    return this.mediaService.deactivateCoverImage(id, req.user);
  }
}
