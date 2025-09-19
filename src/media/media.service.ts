import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Media } from './schemas/media.schema';
import { UploadDto } from './dtos/upload.dto';

@Injectable()
export class MediaService {
  constructor(@InjectModel(Media.name) private mediaModel: Model<Media>) {}

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

    const media = new this.mediaModel({
      url: `uploads/${file.filename}`,
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
}
