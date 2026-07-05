import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappGateway } from './whatsapp.gateway';
import { Contact } from '../entities/contact.entity';
import { Message } from '../entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Message])],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappGateway], // Injetamos o Gateway aqui
})
export class WhatsappModule {}