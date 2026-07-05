import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { User } from './entities/user.entity';
import { Tenant } from './entities/tenant.entity';
import { Contact } from './entities/contact.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'postgres',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [User, Tenant, Contact, Message], // Message adicionado!
      synchronize: false, // Magia ativada: Cria as tabelas automaticamente
    }),
    AuthModule,
    WhatsappModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}