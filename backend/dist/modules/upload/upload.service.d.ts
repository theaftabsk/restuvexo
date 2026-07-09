export declare class UploadService {
    uploadImage(file: any): Promise<{
        success: boolean;
        data: {
            url: string;
        };
    }>;
}
