"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const express = require("express");
const path = require("path");
const helmet_1 = require("helmet");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const server = app.getHttpAdapter().getInstance();
    server.set('trust proxy', 1);
    app.use((0, helmet_1.default)());
    const allowedOrigins = [
        'https://app.restuvexo.shop',
        'https://restuvexo.shop',
        'https://www.restuvexo.shop',
        'https://admin.restuvexo.shop'
    ];
    if (process.env.NODE_ENV !== 'production') {
        allowedOrigins.push('http://localhost:3000');
        allowedOrigins.push('http://app.localhost:3000');
    }
    if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL);
    }
    app.enableCors({
        origin: function (origin, callback) {
            if (!origin)
                return callback(null, true);
            let isAllowed = allowedOrigins.includes(origin);
            if (process.env.NODE_ENV !== 'production') {
                if (/^https?:\/\/([a-z0-9-]+)\.localhost:3000$/.test(origin)) {
                    isAllowed = true;
                }
            }
            if (isAllowed) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
    });
    app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
    app.use((req, res, next) => {
        console.log(`🌐 [ROS API] ${req.method} ${req.url}`);
        next();
    });
    const PORT = process.env.PORT || 5000;
    await app.listen(PORT);
    console.log(`🚀 [ROS Backend] Running smoothly on port ${PORT}`);
}
bootstrap();
//# sourceMappingURL=main.js.map