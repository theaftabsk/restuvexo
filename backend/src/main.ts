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

  // Configure CORS dynamically to support subdomains
  const allowedOrigins = [
    'https://app.restuvexo.shop',
    'https://restuvexo.shop',
    'https://www.restuvexo.shop',
    'https://admin.restuvexo.shop'
  ];

  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://app.localhost:3000');
    allowedOrigins.push('http://localhost:3001');
    allowedOrigins.push('http://localhost:3002');
  }

  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  app.enableCors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      let isAllowed = allowedOrigins.includes(origin);
      if (process.env.NODE_ENV !== 'production') {
        if (/^https?:\/\/([a-z0-9-]+)\.localhost:3000$/.test(origin)) {
          isAllowed = true;
        }
      }
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
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
