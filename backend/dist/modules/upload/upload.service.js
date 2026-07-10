"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
let UploadService = class UploadService {
    async uploadImage(file, type) {
        if (!file) {
            throw new common_1.BadRequestException('No image uploaded');
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
        }
        catch (error) {
            console.error('[Image Upload Error]', error);
            throw new common_1.InternalServerErrorException('Failed to process and upload image.');
        }
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)()
], UploadService);
//# sourceMappingURL=upload.service.js.map