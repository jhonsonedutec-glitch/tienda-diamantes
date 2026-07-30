import 'reflect-metadata';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: process.env.NODE_ENV !== 'test',
    trustProxy: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { rawBody: true },
  );

  const maxReceiptMb = Number(process.env.MAX_RECEIPT_MB ?? 5);

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: maxReceiptMb * 1024 * 1024,
      fields: 10,
    },
  });

  app.enableCors({
    origin: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Free Fire Sales API')
    .setDescription('Pedidos, pagos manuales, despacho y administración.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
