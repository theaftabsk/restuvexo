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
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
    const isOriginAllowed = (origin) => {
        if (!origin)
            return true;
        if (/^https?:\/\/([a-z0-9-]+\.)?restuvexo\.shop(:\d+)?$/i.test(origin))
            return true;
        if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin))
            return true;
        if (/^https?:\/\/([a-z0-9-]+)\.localhost(:\d+)?$/i.test(origin))
            return true;
        if (process.env.FRONTEND_URL && origin.startsWith(process.env.FRONTEND_URL))
            return true;
        return true;
    };
    app.enableCors({
        origin: function (origin, callback) {
            if (isOriginAllowed(origin)) {
                callback(null, true);
            }
            else {
                callback(null, true);
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-api-version", "x-client-id", "x-client-secret"]
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