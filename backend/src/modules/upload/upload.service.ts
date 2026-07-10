import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  async uploadImage(file: any, type?: string) {
    if (!file) {
      throw new BadRequestException('No image uploaded');
    }

    try {
      const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
      const subFolder = type === 'logo' ? 'logos' : 'foods';
      const uploadDir = path.join(__dirname, `../../../public/uploads/${subFolder}`);
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const outputPath = path.join(uploadDir, uniqueFilename);

      const resizeOptions = type === 'logo'
        ? { width: 400, height: 400, fit: sharp.fit.cover }
        : { width: 800, withoutEnlargement: true };

      await sharp(file.buffer)
        .webp({ quality: 75 })
        .resize(resizeOptions)
        .toFile(outputPath);

      return {
        success: true,
        data: {
          url: `/uploads/${subFolder}/${uniqueFilename}`
        }
      };
    } catch (error) {
      console.error('[Image Upload Error]', error);
      throw new InternalServerErrorException('Failed to process and upload image.');
    }
  }
}
