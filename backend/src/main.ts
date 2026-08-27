import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust proxy for rate limiters (Hostinger/nginx reverse proxy)
  const server = app.getHttpAdapter().getInstance();
  server.set('trust proxy', 1);

  // Secure HTTP headers with cross-origin resource policy enabled for static asset serving
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // Configure CORS dynamically to support all subdomains and custom domains
  const isOriginAllowed = (origin: string | undefined): boolean => {
    if (!origin) return true;
    if (/^https?:\/\/([a-z0-9-]+\.)?restuvexo\.shop(:\d+)?$/i.test(origin)) return true;
    if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin)) return true;
    if (/^https?:\/\/([a-z0-9-]+)\.localhost(:\d+)?$/i.test(origin)) return true;
    if (process.env.FRONTEND_URL && origin.startsWith(process.env.FRONTEND_URL)) return true;
    return true;
  };

  app.enableCors({
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-version", "x-client-id", "x-client-secret"]
  });

  // Serve static uploads
  app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

  // Lightweight request logger middleware
  app.use((req, res, next) => {
    console.log(`🌐 [ROS API] ${req.method} ${req.url}`);
    next();
  });

  const PORT = process.env.PORT || 5000;
  await app.listen(PORT);
  console.log(`🚀 [ROS Backend] Running smoothly on port ${PORT}`);
}
bootstrap();
