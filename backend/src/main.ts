import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get('app.apiPrefix');
  const corsOrigins = configService.get('app.corsOrigins');
  const port = configService.get('app.port');

  const nodeEnv = configService.get('app.nodeEnv');

  app.setGlobalPrefix(apiPrefix);

  app.use(helmet());
  app.use(cookieParser());

  // Serve files written by the uploads module. The prefix (/uploads/) and the
  // sanitized filenames produced by UploadsService make path traversal
  // impossible; the physical directory is resolved to an absolute path.
  const storagePath = path.resolve(
    configService.get('STORAGE_PATH', './uploads'),
  );
  app.useStaticAssets(storagePath, { prefix: '/uploads/' });

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Educational ERP SaaS API')
      .setDescription('Multi-tenant Educational ERP Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey(
        { type: 'apiKey', name: 'X-Tenant-Id', in: 'header' },
        'X-Tenant-Id',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  await app.listen(port);
  console.log(`ERP API running on http://localhost:${port}/${apiPrefix}`);
  if (nodeEnv !== 'production') {
    console.log(`Swagger docs at http://localhost:${port}/${apiPrefix}/docs`);
  }
}

bootstrap();
