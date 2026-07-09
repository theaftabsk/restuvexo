import { Response } from 'express';
import { UploadService } from './upload.service';
export declare class UploadController {
    private uploadService;
    constructor(uploadService: UploadService);
    uploadImage(file: any, res: Response): Promise<Response<any, Record<string, any>>>;
}
