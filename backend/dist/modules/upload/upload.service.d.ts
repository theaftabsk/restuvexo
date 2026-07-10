export declare class UploadService {
    uploadImage(file: any, type?: string): Promise<{
        success: boolean;
        data: {
            url: string;
        };
    }>;
}
