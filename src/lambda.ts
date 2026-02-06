import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';
import { Handler } from 'aws-lambda';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Use require so Lambda gets the callable (express has no .default in CommonJS)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require('express');

let cachedServer: Handler;

function serviceUnavailableResponse(message: string, detail?: string): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode: 503,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'SERVICE_UNAVAILABLE',
      message,
      ...(detail && { details: detail }),
    }),
  };
}

async function bootstrap(): Promise<Handler> {
  if (cachedServer) {
    return cachedServer;
  }
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter, {
    bufferLogs: true,
  });
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-role'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Review API')
    .setDescription('Review system MVP API - NestJS on AWS Lambda')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();
  cachedServer = serverlessExpress({ app: expressApp });
  return cachedServer;
}

export const handler: Handler = async (event, context, callback) => {
  try {
    const server = await bootstrap();
    return server(event, context, callback);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bootstrap failed';
    const detail = err instanceof Error ? err.stack : String(err);
    console.error('Lambda bootstrap error:', detail);
    // Hint when DATABASE_URL is likely missing (TypeORM / pg error)
    const hint = !process.env.DATABASE_URL
      ? 'DATABASE_URL is not set in Lambda environment.'
      : process.env.NODE_ENV === 'development'
        ? detail
        : undefined;
    return serviceUnavailableResponse(message, hint);
  }
};
