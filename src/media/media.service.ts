import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Media } from './schemas/media.schema';
import { UploadDto } from './dtos/upload.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name) private mediaModel: Model<Media>,
    private configService: ConfigService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    uploadDto: UploadDto,
    user: any,
  ): Promise<Media> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can upload files');
    }
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      throw new ForbiddenException('Only JPEG/PNG images are allowed');
    }

    // Generar URL completa
    const baseUrl = this.configService.get('BASE_URL') || 'http://localhost:3001';
    const fullUrl = `${baseUrl}/uploads/${file.filename}`;
    
    const media = new this.mediaModel({
      url: fullUrl,
      fileName: file.filename,
      type: uploadDto.type,
      mimeType: file.mimetype,
    });
    return media.save();
  }


  async getFile(id: string): Promise<Media> {
    const media = await this.mediaModel.findById(id);
    if (!media) {
      throw new NotFoundException('File not found');
    }
    return media;
  }


  async deleteFile(id: string, user: any): Promise<void> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete files');
    }
    const media = await this.mediaModel.findByIdAndDelete(id);
    if (!media) {
      throw new NotFoundException('File not found');
    }
    // TODO: Delete file from disk/S3
  }

  async setCoverImage(id: string, user: any): Promise<Media> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can set cover image');
    }
    const media = await this.mediaModel.findById(id);
    if (!media || media.type !== 'cover') {
      throw new NotFoundException('Invalid cover image');
    }
    // Desactivar otras portadas
    await this.mediaModel.updateMany(
      { type: 'cover' },
      { $set: { active: false } },
    );
    media.active = true;
    return media.save();
  }

  async setCoverImageFromUrl(url: string, user: any): Promise<Media> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can set cover image');
    }

    // Validar que la URL sea de una imagen
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const urlLower = url.toLowerCase();
    const hasValidExtension = imageExtensions.some(ext => urlLower.includes(ext));
    
    if (!hasValidExtension && !urlLower.includes('image')) {
      throw new BadRequestException('La URL debe apuntar a una imagen válida');
    }

    // Desactivar otras portadas
    await this.mediaModel.updateMany(
      { type: 'cover' },
      { $set: { active: false } },
    );

    // Crear nueva entrada de media con la URL
    const media = new this.mediaModel({
      url: url,
      fileName: `cover_${Date.now()}`,
      type: 'cover',
      mimeType: 'image/jpeg', // Asumimos JPEG por defecto para URLs externas
      active: true,
    });

    return media.save();
  }


  async getActiveCoverUrl(): Promise<{ id: string; url: string } | { url: null }> {
    const active = await this.mediaModel
      .findOne({ type: 'cover', active: true })
      .sort({ updatedAt: -1 });
    if (!active) {
      return { url: null };
    }
    return { id: active.id, url: active.url };
  }

  async listImages(filters: { type?: string; limit?: number; offset?: number }): Promise<{
    images: Media[];
    total: number;
    hasMore: boolean;
  }> {
    const { type, limit = 50, offset = 0 } = filters;
    
    const query: any = {};
    if (type) {
      query.type = type;
    }

    const [images, total] = await Promise.all([
      this.mediaModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec(),
      this.mediaModel.countDocuments(query)
    ]);

    return {
      images,
      total,
      hasMore: offset + images.length < total
    };
  }

}
