import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { Contact } from '../entities/contact.entity';
import { Message } from '../entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Message])], // Message injetado
  controllers: [WhatsappController],
  providers: [WhatsappService],
})
export class WhatsappModule {}