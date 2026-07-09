import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  async uploadImage(file: any) {
    if (!file) {
      throw new BadRequestException('No image uploaded');
    }

    try {
      const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
      const uploadDir = path.join(__dirname, '../../../public/uploads/foods');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const outputPath = path.join(uploadDir, uniqueFilename);

      await sharp(file.buffer)
        .webp({ quality: 80 })
        .resize({ width: 800, withoutEnlargement: true })
        .toFile(outputPath);

      return {
        success: true,
        data: {
          url: `/uploads/foods/${uniqueFilename}`
        }
      };
    } catch (error) {
      console.error('[Image Upload Error]', error);
      throw new InternalServerErrorException('Failed to process and upload image.');
    }
  }
}
