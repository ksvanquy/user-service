import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cấu hình CORS
  app.enableCors({
    origin: '*', // Cho phép tất cả các nguồn gửi yêu cầu
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Các phương thức HTTP cho phép
    allowedHeaders: 'Content-Type, Accept', // Các header cho phép
  });

  // Thêm ValidationPipe toàn cục
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
