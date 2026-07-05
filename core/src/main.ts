import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitando CORS para comunicação futura com nosso front-end
  app.enableCors();
  
  // Pegando a porta das variáveis de ambiente orquestradas pelo Docker
  const port = process.env.CORE_PORT || 3000;
  await app.listen(port);
  
  Logger.log(`🚀 ZeusPro Core rodando perfeitamente na porta ${port}`, 'Bootstrap');
}
bootstrap();