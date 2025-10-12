import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('Online Shop API')
    .setDescription('API documentation for Online Shop built with NestJS and PostgreSQL')
    .setVersion('1.0')
    .addBearerAuth() // optional if you use JWT auth later
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Swagger running at http://localhost:3000/api/docs`);
}
bootstrap();
