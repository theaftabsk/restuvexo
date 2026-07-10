import { Controller, Post, UseInterceptors, UploadedFile, Query, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UploadService } from './upload.service';

@Controller('api/upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: any,
    @Query('type') type: string,
    @Res() res: Response
  ) {
    const result = await this.uploadService.uploadImage(file, type);
    return res.status(200).json(result);
  }
}
