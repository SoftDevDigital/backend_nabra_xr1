import {
  Injectable,
  ForbiddenException,
  NotFoundException,
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

  async uploadByUrl(uploadDto: UploadDto, user: any): Promise<Media> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can upload files');
    }
    const { url, type } = uploadDto;
    // Infer filename and mimetype from URL
    const fileName = url.split('/').pop() || 'image';
    const lower = fileName.toLowerCase();
    let mimeType = 'image/jpeg';
    if (lower.endsWith('.png')) mimeType = 'image/png';
    else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';

    const media = new this.mediaModel({
      url,
      fileName,
      type,
      mimeType,
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

  async getFileUrl(id: string): Promise<{ url: string; fileName: string }> {
    const media = await this.mediaModel.findById(id);
    if (!media) {
      throw new NotFoundException('File not found');
    }
    return {
      url: media.url,
      fileName: media.fileName,
    };
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

  async deactivateCoverImage(id: string, user: any): Promise<Media> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can deactivate cover image');
    }
    const media = await this.mediaModel.findById(id);
    if (!media || media.type !== 'cover') {
      throw new NotFoundException('Invalid cover image');
    }
    if (!media.active) {
      throw new ForbiddenException('Cover image is already deactivated');
    }
    media.active = false;
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
}
